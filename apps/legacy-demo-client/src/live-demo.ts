import {
  evaluatePathAFixtureScenario,
  evaluatePathCFixtureScenario,
  type PathAFixtureScenario,
  type PathCFixtureScenario,
} from "../../../packages/fixtures/src/index";
import { PMA_KIND, PMU_KIND, PMX_KIND, type PreparedMigrationState } from "../../../packages/protocol-a/src/index";
import {
  STA_KIND,
  STC_KIND,
  type SocialTransitionState,
} from "../../../packages/protocol-c/src/index";
import { getSingleTagValue, type NostrEvent } from "../../../packages/protocol-shared/src/index";
import { inspectOtsProofEvent } from "../../ots-helper/src/inspect";

export type DemoTone = "ok" | "warn" | "error" | "neutral";

export type LiveDemoAction = {
  id: string;
  createdAt: number;
  lane: "path-a" | "path-c";
  family: "protocol" | "proof" | "claim" | "attestation";
  title: string;
  subtitle: string;
  event: NostrEvent;
  accent: DemoTone;
};

export type PathALiveStep = {
  index: number;
  currentAction?: LiveDemoAction;
  visibleScenario: PathAFixtureScenario;
  resolvedState: PreparedMigrationState;
  tone: DemoTone;
  title: string;
  detail: string;
  clientFacts: string[];
};

export type PathALivePlayback = {
  scenarioId: string;
  actions: LiveDemoAction[];
  steps: PathALiveStep[];
};

export type PathCLiveStep = {
  index: number;
  currentAction?: LiveDemoAction;
  visibleScenario: PathCFixtureScenario;
  resolvedState: SocialTransitionState;
  tone: DemoTone;
  title: string;
  detail: string;
  clientFacts: string[];
};

export type PathCLivePlayback = {
  scenarioId: string;
  actions: LiveDemoAction[];
  steps: PathCLiveStep[];
};

export function buildPathALivePlayback(scenario: PathAFixtureScenario): PathALivePlayback {
  const actions = [
    ...scenario.events.map((event) => toPathAProtocolAction(event)),
    ...scenario.otsProofs.map((event) => toPathAProofAction(event)),
  ].sort(compareDemoActions);

  const steps: PathALiveStep[] = [];

  for (let index = 0; index <= actions.length; index += 1) {
    const visibleActions = actions.slice(0, index);
    const visibleScenario: PathAFixtureScenario = {
      ...scenario,
      events: visibleActions.filter((entry) => entry.family === "protocol").map((entry) => cloneEvent(entry.event)),
      otsProofs: visibleActions.filter((entry) => entry.family === "proof").map((entry) => cloneEvent(entry.event)),
    };
    const resolvedState = evaluatePathAFixtureScenario(visibleScenario);
    const presentation = describePathAStep({
      visibleScenario,
      resolvedState,
    });

    steps.push({
      index,
      currentAction: actions[index - 1],
      visibleScenario,
      resolvedState,
      tone: presentation.tone,
      title: presentation.title,
      detail: index === 0 ? "Start with an empty relay view, then publish the scenario events one by one." : presentation.detail,
      clientFacts: buildPathAClientFacts({
        scenario,
        visibleScenario,
        resolvedState,
      }),
    });
  }

  return {
    scenarioId: scenario.id,
    actions,
    steps,
  };
}

export async function buildPathCLivePlayback(
  scenario: PathCFixtureScenario,
): Promise<PathCLivePlayback> {
  const actions = [
    ...scenario.claims.map((event) => toPathCClaimAction(event, scenario)),
    ...scenario.attestations.map((event) => toPathCAttestationAction(event, scenario)),
  ].sort(compareDemoActions);

  const steps: PathCLiveStep[] = [];

  for (let index = 0; index <= actions.length; index += 1) {
    const visibleActions = actions.slice(0, index);
    const visibleScenario: PathCFixtureScenario = {
      ...scenario,
      claims: visibleActions.filter((entry) => entry.family === "claim").map((entry) => cloneEvent(entry.event)),
      attestations: visibleActions
        .filter((entry) => entry.family === "attestation")
        .map((entry) => cloneEvent(entry.event)),
    };
    const resolvedState = await evaluatePathCFixtureScenario(visibleScenario);
    const presentation = describeSocialTransitionState(resolvedState);

    steps.push({
      index,
      currentAction: actions[index - 1],
      visibleScenario,
      resolvedState,
      tone: presentation.tone,
      title: presentation.title,
      detail: index === 0 ? "Start with no social evidence visible, then publish claims and attestations in order." : presentation.detail,
      clientFacts: buildPathCClientFacts({
        scenario,
        visibleScenario,
        resolvedState,
      }),
    });
  }

  return {
    scenarioId: scenario.id,
    actions,
    steps,
  };
}

function toPathAProtocolAction(event: NostrEvent): LiveDemoAction {
  if (event.kind === PMA_KIND) {
    return {
      id: event.id!,
      createdAt: event.created_at,
      lane: "path-a",
      family: "protocol",
      title: "Publish PMA",
      subtitle: `Old key names migration key ${shortHex(getSingleTagValue(event, "m"))}.`,
      event,
      accent: "neutral",
    };
  }

  if (event.kind === PMU_KIND) {
    return {
      id: event.id!,
      createdAt: event.created_at,
      lane: "path-a",
      family: "protocol",
      title: "Publish PMU",
      subtitle: `Confirmed authority advances toward ${shortHex(getSingleTagValue(event, "u"))}.`,
      event,
      accent: "neutral",
    };
  }

  return {
    id: event.id!,
    createdAt: event.created_at,
    lane: "path-a",
    family: "protocol",
    title: "Publish PMX",
    subtitle: `Execution announces successor key ${shortHex(event.pubkey)} for authority ${shortHex(getSingleTagValue(event, "e"))}.`,
    event,
    accent: "neutral",
  };
}

function toPathAProofAction(event: NostrEvent): LiveDemoAction {
  const inspection = inspectOtsProofEvent(event);
  const status = inspection.ok ? inspection.status : "pending";

  return {
    id: event.id!,
    createdAt: event.created_at,
    lane: "path-a",
    family: "proof",
    title: status === "bitcoin_confirmed" ? "Attach Bitcoin-confirmed 1040 proof" : "Attach pending 1040 proof",
    subtitle: `Proof targets ${shortHex(getSingleTagValue(event, "e"))} and keeps Path A separate from raw proof bytes.`,
    event,
    accent: status === "bitcoin_confirmed" ? "ok" : "warn",
  };
}

function toPathCClaimAction(event: NostrEvent, scenario: PathCFixtureScenario): LiveDemoAction {
  const role =
    event.pubkey === scenario.oldPubkey ? "old" : event.pubkey === scenario.newPubkey ? "new" : undefined;
  const actor =
    role === "old"
      ? "Old key posts a claim"
      : role === "new"
        ? "New key posts a claim"
        : "A social claim appears";

  return {
    id: event.id!,
    createdAt: event.created_at,
    lane: "path-c",
    family: "claim",
    title: actor,
    subtitle: `Transition ${shortHex(scenario.oldPubkey)} -> ${shortHex(scenario.newPubkey)} is now machine-readable.`,
    event,
    accent: "neutral",
  };
}

function toPathCAttestationAction(event: NostrEvent, scenario: PathCFixtureScenario): LiveDemoAction {
  const stance = getSingleTagValue(event, "s") ?? "uncertain";
  const attestorLabel = scenario.viewerFollowPubkeys.includes(event.pubkey)
    ? "Followed attestor"
    : event.pubkey === scenario.oldPubkey || event.pubkey === scenario.newPubkey
      ? "Self-authored"
      : "Unfollowed attestor";

  return {
    id: event.id!,
    createdAt: event.created_at,
    lane: "path-c",
    family: "attestation",
    title: `${attestorLabel} posts ${stance} STA`,
    subtitle: `STA stance is ${stance} and remains separate from Path A cryptographic authority.`,
    event,
    accent: stance === "oppose" ? "error" : stance === "support" ? "ok" : "warn",
  };
}

function compareDemoActions(a: LiveDemoAction, b: LiveDemoAction): number {
  if (a.lane === "path-a" && b.lane === "path-a") {
    return (
      pathAActionPriority(a) - pathAActionPriority(b) ||
      a.createdAt - b.createdAt ||
      a.id.localeCompare(b.id)
    );
  }

  return a.createdAt - b.createdAt || familyPriority(a.family) - familyPriority(b.family) || a.id.localeCompare(b.id);
}

function pathAActionPriority(action: LiveDemoAction): number {
  if (action.event.kind === PMA_KIND) {
    return 0;
  }

  if (action.event.kind === PMU_KIND) {
    return 2;
  }

  if (action.event.kind === PMX_KIND) {
    return 4;
  }

  const targetKind = Number(getSingleTagValue(action.event, "k") ?? -1);
  if (targetKind === PMA_KIND) {
    return 1;
  }
  if (targetKind === PMU_KIND) {
    return 3;
  }

  return 5;
}

function familyPriority(family: LiveDemoAction["family"]): number {
  switch (family) {
    case "protocol":
      return 0;
    case "proof":
      return 1;
    case "claim":
      return 0;
    case "attestation":
      return 1;
  }
}

function describePathAStep(input: {
  visibleScenario: PathAFixtureScenario;
  resolvedState: PreparedMigrationState;
}): {
  tone: DemoTone;
  title: string;
  detail: string;
} {
  const { visibleScenario, resolvedState: state } = input;

  if (state.state === "none" && visibleScenario.events.length > 0) {
    return {
      tone: "warn",
      title: "Signed rotation intent is visible",
      detail: "Clients can render the published Path A event, but they still cannot treat it as valid authority until the required proof state arrives.",
    };
  }

  switch (state.state) {
    case "none":
      return {
        tone: "neutral",
        title: "No relay events yet",
        detail: "Clients still see no published Path A material for this old key.",
      };
    case "draft_local":
      return {
        tone: "neutral",
        title: "Local draft only",
        detail: "The key owner has not published a signed authority event yet.",
      };
    case "published_pending_ots":
      return {
        tone: "warn",
        title: "Pending authority, not valid yet",
        detail: "Clients can see migration intent, but pending OTS evidence does not make Path A authority valid.",
      };
    case "bitcoin_confirmed":
      return {
        tone: "ok",
        title: "Confirmed authority is live",
        detail: `Clients can now treat ${shortHex(state.authorityId)} as the current Path A authority.`,
      };
    case "executed":
      return {
        tone: "ok",
        title: "Identity continues on the new key",
        detail: `Rotation executed cleanly. Clients can move continuity to ${shortHex(state.newPubkey)}.`,
      };
    case "conflict":
      if (state.conflictKind === "multiple_roots") {
        return {
          tone: "error",
          title: "Plural root conflict",
          detail: "Clients must stop because more than one confirmed PMA root remains at the same earliest anchor height.",
        };
      }

      if (state.conflictKind === "multiple_children") {
        return {
          tone: "error",
          title: "Plural child conflict",
          detail: "Clients see one confirmed root but multiple confirmed PMU children, so no single active authority can be chosen.",
        };
      }

      return {
        tone: "error",
        title: "Plural execution conflict",
        detail: "Clients see one confirmed authority but multiple PMX execution outcomes, so the new key is ambiguous.",
      };
  }
}

function describeSocialTransitionState(state: SocialTransitionState): {
  tone: DemoTone;
  title: string;
  detail: string;
} {
  switch (state.state) {
    case "none":
      return {
        tone: "neutral",
        title: "No social continuity yet",
        detail: "No STC or STA evidence has been published for the audience to evaluate.",
      };
    case "claimed":
      return {
        tone: "warn",
        title: "Claims exist, but social backing is thin",
        detail: "Clients can show first-party claims and self-authored evidence, but not independent followed support yet.",
      };
    case "socially_supported":
      return {
        tone: "ok",
        title: "Locally supported social continuity",
        detail: "The viewer’s follow set contains at least one supporting third party, so clients can show strong advisory continuity.",
      };
    case "socially_opposed":
      return {
        tone: "error",
        title: "Locally opposed social continuity",
        detail: "Followed third parties oppose the claim, so clients should show the rotation as contested.",
      };
    case "socially_split":
      return {
        tone: "warn",
        title: "Social continuity is split",
        detail: "Followed third parties disagree, so clients should show advisory ambiguity rather than a single social verdict.",
      };
  }
}

function buildPathAClientFacts(input: {
  scenario: PathAFixtureScenario;
  visibleScenario: PathAFixtureScenario;
  resolvedState: PreparedMigrationState;
}): string[] {
  const authorityId = "authorityId" in input.resolvedState ? input.resolvedState.authorityId : undefined;

  return [
    `published protocol events ${input.visibleScenario.events.length}`,
    `published ots proofs ${input.visibleScenario.otsProofs.length}`,
    `old key ${shortHex(input.scenario.oldPubkey)}`,
    authorityId ? `active authority ${shortHex(authorityId)}` : "active authority not chosen yet",
    input.resolvedState.state === "executed"
      ? `continued identity ${shortHex(input.resolvedState.newPubkey)}`
      : "continued identity not executed yet",
  ];
}

function buildPathCClientFacts(input: {
  scenario: PathCFixtureScenario;
  visibleScenario: PathCFixtureScenario;
  resolvedState: SocialTransitionState;
}): string[] {
  const supportCount = "supportPubkeys" in input.resolvedState ? input.resolvedState.supportPubkeys.length : 0;
  const opposeCount = "opposePubkeys" in input.resolvedState ? input.resolvedState.opposePubkeys.length : 0;

  return [
    `published claims ${input.visibleScenario.claims.length}`,
    `published attestations ${input.visibleScenario.attestations.length}`,
    `viewer follows ${input.scenario.viewerFollowPubkeys.length} attestors`,
    `support count ${supportCount}`,
    `oppose count ${opposeCount}`,
  ];
}

function cloneEvent(event: NostrEvent): NostrEvent {
  return {
    ...event,
    tags: event.tags.map((tag) => [...tag]),
  };
}

function shortHex(value: string | undefined): string {
  if (!value) {
    return "(none)";
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}
