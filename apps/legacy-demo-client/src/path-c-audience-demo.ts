import {
  computeTransitionId,
  deriveSchnorrPublicKey,
  getSingleTagValue,
  signNostrEventWithSecretKey,
  type Hex32,
  type NostrEvent,
} from "@tack/protocol-shared";
import { resolveSocialTransition, type SocialTransitionState } from "@tack/protocol-c";
import { getDemoSecretKeyForPubkey, getPathCFixtureScenario } from "../../../packages/fixtures/src/index";

export type AudienceLocalAction = "accept" | "reject" | "ignore";

export type PathCAudienceScenarioId =
  | "claim-only"
  | "socially-supported"
  | "socially-split"
  | "self-asserted-noise";

export type AudienceMember = {
  id: string;
  name: string;
  pubkey: Hex32;
  viewerFollows: boolean;
  followsOld: boolean;
  followedBack: boolean;
  liveStance?: "support" | "oppose" | "uncertain";
  method?: string;
};

export type PathCAudienceStep = {
  id: string;
  label: string;
  title: string;
  detail: string;
  warning?: string;
  recommendedAction?: AudienceLocalAction;
  visibleClaims: NostrEvent[];
  visibleAttestations: NostrEvent[];
  visibleMembers: AudienceMember[];
  state: SocialTransitionState;
  followerCount: number;
  mutualCount: number;
  viewerTrustedCount: number;
};

export type PathCAudienceExperience = {
  scenarioId: PathCAudienceScenarioId;
  title: string;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  transitionId: string;
  members: AudienceMember[];
  steps: PathCAudienceStep[];
};

export type AudienceDecisionCopy = {
  title: string;
  detail: string;
  tone: "neutral" | "ok" | "warn" | "error";
};

const FOLLOWER_COUNT = 21;
const FOLLOW_BACK_COUNT = 12;
const VIEWER_TRUSTED_COUNT = 5;
const AUDIENCE_NAMES = [
  "Ava",
  "Milo",
  "Noa",
  "Iris",
  "Theo",
  "Sana",
  "Luca",
  "Maya",
  "Zane",
  "Nina",
  "Levi",
  "Jade",
  "Omar",
  "Tess",
  "Rafi",
  "Esme",
  "Kian",
  "Lena",
  "Ari",
  "June",
  "Remy",
] as const;
const AUDIENCE_METHODS = ["video", "in_person", "chat", "website", "voice"] as const;
const AUDIENCE_SECRET_KEYS = AUDIENCE_NAMES.map((_, index) => (index + 0x31).toString(16).padStart(64, "0"));

const cache = new Map<PathCAudienceScenarioId, Promise<PathCAudienceExperience>>();

export function getPathCAudienceExperience(
  scenarioId: PathCAudienceScenarioId,
): Promise<PathCAudienceExperience> {
  const existing = cache.get(scenarioId);
  if (existing) {
    return existing;
  }

  const built = buildPathCAudienceExperience(scenarioId);
  cache.set(scenarioId, built);
  return built;
}

export function describeAudienceDecision(input: {
  decision: AudienceLocalAction | undefined;
  step: PathCAudienceStep;
}): AudienceDecisionCopy {
  if (!input.decision) {
    return {
      title: "No local action chosen yet",
      detail:
        input.step.recommendedAction === "ignore"
          ? "The client should de-emphasize the claim until more followed evidence appears."
          : input.step.recommendedAction === "accept"
            ? "The client can show a positive advisory continuity message without rewriting follows."
            : input.step.recommendedAction === "reject"
              ? "The client should keep the old key primary and surface the opposition warning."
              : "The client is still collecting social evidence.",
      tone:
        input.step.state.state === "socially_supported"
          ? "ok"
          : input.step.state.state === "socially_split" || input.step.state.state === "claimed"
            ? "warn"
            : "neutral",
    };
  }

  switch (input.decision) {
    case "accept":
      return {
        title: "Accepted locally",
        detail:
          input.step.state.state === "socially_split"
            ? "The user is choosing to trust the rotation despite split social evidence. The UI should keep the split warning visible."
            : "The user accepts the social continuity claim locally. The client may surface the successor and continuity hints, but must not silently rewrite follows.",
        tone: input.step.state.state === "socially_split" ? "warn" : "ok",
      };
    case "reject":
      return {
        title: "Rejected locally",
        detail:
          "The user rejects the social continuity claim locally. The client should keep the old key primary and suppress successor suggestions.",
        tone: "error",
      };
    case "ignore":
      return {
        title: "Ignored for now",
        detail:
          "The user leaves the claim unactioned. The client should de-emphasize it until more followed evidence or explicit user interest appears.",
        tone: "neutral",
      };
  }
}

async function buildPathCAudienceExperience(
  scenarioId: PathCAudienceScenarioId,
): Promise<PathCAudienceExperience> {
  const scenario = await getPathCFixtureScenario(scenarioId);
  if (!scenario) {
    throw new Error(`missing Path C fixture scenario ${scenarioId}`);
  }

  const oldSecretKey = getDemoSecretKeyForPubkey(scenario.oldPubkey);
  const newSecretKey = getDemoSecretKeyForPubkey(scenario.newPubkey);
  if (!oldSecretKey || !newSecretKey) {
    throw new Error(`missing demo secret key for Path C scenario ${scenarioId}`);
  }

  const transitionId = await computeTransitionId(scenario.oldPubkey, scenario.newPubkey);
  const members = AUDIENCE_SECRET_KEYS.map((secretKeyHex, index) => {
    const pubkey = deriveSchnorrPublicKey(secretKeyHex);
    return {
      id: `member-${index + 1}`,
      name: AUDIENCE_NAMES[index]!,
      pubkey,
      viewerFollows: index < VIEWER_TRUSTED_COUNT,
      followsOld: true,
      followedBack: index < FOLLOW_BACK_COUNT,
    } satisfies AudienceMember;
  });

  const oldClaim = await buildClaimEvent({
    secretKeyHex: oldSecretKey,
    pubkey: scenario.oldPubkey,
    oldPubkey: scenario.oldPubkey,
    newPubkey: scenario.newPubkey,
    createdAt: 1_710_000_000,
    content: "my key rotated; please treat the new key as my social successor",
  });
  const newClaim = await buildClaimEvent({
    secretKeyHex: newSecretKey,
    pubkey: scenario.newPubkey,
    oldPubkey: scenario.oldPubkey,
    newPubkey: scenario.newPubkey,
    createdAt: 1_710_000_060,
    content: "confirming the move from the old key to the new key",
  });

  const trustedSupportEvents = await Promise.all(
    members.slice(0, 4).map((member, index) =>
      buildAttestationEvent({
        secretKeyHex: AUDIENCE_SECRET_KEYS[index]!,
        pubkey: member.pubkey,
        oldPubkey: scenario.oldPubkey,
        newPubkey: scenario.newPubkey,
        stance: "support",
        method: AUDIENCE_METHODS[index % AUDIENCE_METHODS.length],
        createdAt: 1_710_000_120 + index * 30,
        content: `${member.name} verified the rotation directly.`,
        referencedClaimIds: [oldClaim.id!, newClaim.id!],
      }),
    ),
  );
  const trustedOpposeEvent = await buildAttestationEvent({
    secretKeyHex: AUDIENCE_SECRET_KEYS[4]!,
    pubkey: members[4]!.pubkey,
    oldPubkey: scenario.oldPubkey,
    newPubkey: scenario.newPubkey,
    stance: "oppose",
    method: "chat",
    createdAt: 1_710_000_280,
    content: "I am not convinced yet.",
    referencedClaimIds: [oldClaim.id!, newClaim.id!],
  });
  const selfSupportEvent = await buildAttestationEvent({
    secretKeyHex: oldSecretKey,
    pubkey: scenario.oldPubkey,
    oldPubkey: scenario.oldPubkey,
    newPubkey: scenario.newPubkey,
    stance: "support",
    method: "other",
    createdAt: 1_710_000_180,
    content: "old key self-assertion",
    referencedClaimIds: [oldClaim.id!],
  });
  const selfOpposeEvent = await buildAttestationEvent({
    secretKeyHex: newSecretKey,
    pubkey: scenario.newPubkey,
    oldPubkey: scenario.oldPubkey,
    newPubkey: scenario.newPubkey,
    stance: "oppose",
    method: "other",
    createdAt: 1_710_000_210,
    content: "new key self-authored opposition noise",
    referencedClaimIds: [newClaim.id!],
  });

  const steps: PathCAudienceStep[] = [];
  const baseViewerFollowSet = new Set(
    members.filter((member) => member.viewerFollows).map((member) => member.pubkey),
  );

  steps.push(
    await buildStep({
      id: "followers-arrive",
      label: "1 · room notices the account",
      title: "21 people follow the old key",
      detail:
        "The room already knows the old key. Nothing about rotation is visible yet, but the audience graph exists and can later contextualize Path C.",
      warning: "No claim exists yet. A client should stay quiet.",
      members,
      visibleClaims: [],
      visibleAttestations: [],
      oldPubkey: scenario.oldPubkey,
      newPubkey: scenario.newPubkey,
      viewerFollowSet: baseViewerFollowSet,
      recommendedAction: undefined,
    }),
  );

  steps.push(
    await buildStep({
      id: "follow-backs",
      label: "2 · strong social ties",
      title: "The old key follows 12 of them back",
      detail:
        "Now the audience can see who looks socially close to the old key. These 12 mutuals are the accounts a client should highlight once a claim appears.",
      warning: "Mutual follows are context, not proof.",
      members,
      visibleClaims: [],
      visibleAttestations: [],
      oldPubkey: scenario.oldPubkey,
      newPubkey: scenario.newPubkey,
      viewerFollowSet: baseViewerFollowSet,
      recommendedAction: undefined,
    }),
  );

  steps.push(
    await buildStep({
      id: "old-claim",
      label: "3 · first-party claim",
      title: "The old key publishes a 1778 claim",
      detail:
        "The audience now sees an STC by the old key. The claim is machine-readable, but it is still only first-party social evidence.",
      warning: "Do not treat a lone STC as proof of continuity.",
      members,
      visibleClaims: [oldClaim],
      visibleAttestations: [],
      oldPubkey: scenario.oldPubkey,
      newPubkey: scenario.newPubkey,
      viewerFollowSet: baseViewerFollowSet,
      recommendedAction: "ignore",
    }),
  );

  const bothClaimsStep = await buildStep({
    id: "both-claims",
    label: "4 · both sides claim continuity",
    title: "Old and new keys both publish claims",
    detail:
      "Now the rotation is explicit from both sides. Clients can surface the claim more prominently, but still need independent followed attestors before showing strong support.",
    warning: "Still advisory only. Path C remains separate from Path A.",
    members,
    visibleClaims: [oldClaim, newClaim],
    visibleAttestations: [],
    oldPubkey: scenario.oldPubkey,
    newPubkey: scenario.newPubkey,
    viewerFollowSet: baseViewerFollowSet,
    recommendedAction: "ignore",
  });
  steps.push(bothClaimsStep);

  if (scenarioId === "claim-only") {
    return {
      scenarioId,
      title: "Path C Audience Walkthrough",
      oldPubkey: scenario.oldPubkey,
      newPubkey: scenario.newPubkey,
      transitionId,
      members,
      steps,
    };
  }

  if (scenarioId === "socially-supported") {
    steps.push(
      await buildStep({
        id: "followed-support",
        label: "5 · followed people weigh in",
        title: "Four followed mutuals publish support",
        detail:
          "This is the moment a user-facing client can feel useful: people you already follow are backing the rotation, and the relationship graph makes that support legible.",
        warning: "Support is strong advisory evidence, but it still does not override Path A.",
        members,
        visibleClaims: [oldClaim, newClaim],
        visibleAttestations: trustedSupportEvents,
        oldPubkey: scenario.oldPubkey,
        newPubkey: scenario.newPubkey,
        viewerFollowSet: baseViewerFollowSet,
        recommendedAction: "accept",
      }),
    );
  }

  if (scenarioId === "socially-split") {
    steps.push(
      await buildStep({
        id: "followed-support",
        label: "5 · first wave of support",
        title: "Four followed mutuals publish support",
        detail:
          "Support arrives from people you already trust locally, so the UI can move from a claim to a socially supported rotation.",
        warning: "Advisory only. Users should still be able to inspect raw STAs.",
        members,
        visibleClaims: [oldClaim, newClaim],
        visibleAttestations: trustedSupportEvents,
        oldPubkey: scenario.oldPubkey,
        newPubkey: scenario.newPubkey,
        viewerFollowSet: baseViewerFollowSet,
        recommendedAction: "accept",
      }),
    );
    steps.push(
      await buildStep({
        id: "followed-oppose",
        label: "6 · disagreement arrives",
        title: "A followed mutual publishes opposition",
        detail:
          "Now the exact same local graph produces a split result. This is where the client should switch from a confident green message to a warning with explicit user choice.",
        warning: "Social evidence is now split. The client should not auto-nudge a successor follow.",
        members,
        visibleClaims: [oldClaim, newClaim],
        visibleAttestations: [...trustedSupportEvents, trustedOpposeEvent],
        oldPubkey: scenario.oldPubkey,
        newPubkey: scenario.newPubkey,
        viewerFollowSet: baseViewerFollowSet,
        recommendedAction: "ignore",
      }),
    );
  }

  if (scenarioId === "self-asserted-noise") {
    steps.push(
      await buildStep({
        id: "self-noise",
        label: "5 · self-authored noise",
        title: "Old and new keys self-attest, but nobody independent does",
        detail:
          "The claim is visible and the self-authored STAs are valid events, but a good client should keep reminding the user that self-assertion is not third-party support.",
        warning: "These STAs do not count as independent backing. De-emphasize them in the main UI.",
        members,
        visibleClaims: [oldClaim, newClaim],
        visibleAttestations: [selfSupportEvent, selfOpposeEvent],
        oldPubkey: scenario.oldPubkey,
        newPubkey: scenario.newPubkey,
        viewerFollowSet: baseViewerFollowSet,
        recommendedAction: "ignore",
      }),
    );
  }

  return {
    scenarioId,
    title: "Path C Audience Walkthrough",
    oldPubkey: scenario.oldPubkey,
    newPubkey: scenario.newPubkey,
    transitionId,
    members,
    steps,
  };
}

async function buildStep(input: {
  id: string;
  label: string;
  title: string;
  detail: string;
  warning?: string;
  recommendedAction?: AudienceLocalAction;
  members: AudienceMember[];
  visibleClaims: NostrEvent[];
  visibleAttestations: NostrEvent[];
  oldPubkey: Hex32;
  newPubkey: Hex32;
  viewerFollowSet: Set<Hex32>;
}): Promise<PathCAudienceStep> {
  const state = await resolveSocialTransition({
    viewerFollowSet: input.viewerFollowSet,
    oldPubkey: input.oldPubkey,
    newPubkey: input.newPubkey,
    claims: input.visibleClaims,
    attestations: input.visibleAttestations,
  });
  const attestationByPubkey = new Map<string, NostrEvent>();
  for (const event of input.visibleAttestations) {
    attestationByPubkey.set(event.pubkey, event);
  }

  return {
    id: input.id,
    label: input.label,
    title: input.title,
    detail: input.detail,
    warning: input.warning,
    recommendedAction: input.recommendedAction,
    visibleClaims: input.visibleClaims,
    visibleAttestations: input.visibleAttestations,
    visibleMembers: input.members.map((member) => {
      const attestation = attestationByPubkey.get(member.pubkey);
      return {
        ...member,
        liveStance: attestation
          ? ((getSingleTagValue(attestation, "s") as AudienceMember["liveStance"]) ?? undefined)
          : undefined,
        method: attestation ? getSingleTagValue(attestation, "m") ?? undefined : undefined,
      };
    }),
    state,
    followerCount: FOLLOWER_COUNT,
    mutualCount: FOLLOW_BACK_COUNT,
    viewerTrustedCount: VIEWER_TRUSTED_COUNT,
  };
}

async function buildClaimEvent(input: {
  secretKeyHex: string;
  pubkey: Hex32;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  createdAt: number;
  content: string;
}): Promise<NostrEvent> {
  const transitionId = await computeTransitionId(input.oldPubkey, input.newPubkey);
  return signNostrEventWithSecretKey(
    {
      pubkey: input.pubkey,
      created_at: input.createdAt,
      kind: 1778,
      tags: [
        ["d", transitionId],
        ["o", input.oldPubkey],
        ["n", input.newPubkey],
        ["alt", "Social Transition Claim"],
      ],
      content: input.content,
    },
    input.secretKeyHex,
  );
}

async function buildAttestationEvent(input: {
  secretKeyHex: string;
  pubkey: Hex32;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  stance: "support" | "oppose" | "uncertain";
  method: string;
  createdAt: number;
  content: string;
  referencedClaimIds: string[];
}): Promise<NostrEvent> {
  const transitionId = await computeTransitionId(input.oldPubkey, input.newPubkey);
  return signNostrEventWithSecretKey(
    {
      pubkey: input.pubkey,
      created_at: input.createdAt,
      kind: 31778,
      tags: [
        ["d", transitionId],
        ["o", input.oldPubkey],
        ["n", input.newPubkey],
        ["s", input.stance],
        ["m", input.method],
        ...input.referencedClaimIds.map((claimId) => ["e", claimId] as string[]),
        ["alt", "Social Transition Attestation"],
      ],
      content: input.content,
    },
    input.secretKeyHex,
  );
}
