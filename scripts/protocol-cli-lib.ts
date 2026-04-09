import {
  buildPmaV3,
  buildPmuV3,
  buildPmxV3,
  resolvePreparedMigrationV3,
  type OtsProofSummary,
  type PreparedMigrationV3State,
  type SignerLike,
} from "../packages/protocol-a/src/index";
import {
  buildSocialAttestation,
  buildSocialClaim,
  resolveSocialTransition,
  type SocialTransitionState,
} from "../packages/protocol-c/src/index";
import {
  buildPreparedBundle,
  buildSocialBundle,
  parsePreparedBundle,
  parseSocialBundle,
  serializePreparedBundle,
  serializeSocialBundle,
  type PreparedBundle,
  type PreparedBundleProof,
  type SocialBundle,
} from "../packages/evidence-bundles/src/index";
import {
  deriveSchnorrPublicKey,
  getSingleTagValue,
  signNostrEventWithSecretKey,
  signSchnorrDigestWithSecretKey,
  type EventId,
  type Hex32,
  type NostrEvent,
} from "../packages/protocol-shared/src/index";
import { summarizeOtsProofEventForV3 } from "../apps/ots-helper/src/real-inspect";
import {
  DEFAULT_RELAYS,
  formatReceiptSummary,
  openRelaySession,
  publishEvent,
  parseRelayUrls,
  type NostrRelayFilter,
  type RelayReceipt,
  type RelaySession,
} from "./relay-runtime";

const MOCK_OTS_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000041";

export type InspectTransitionResult = {
  oldPubkey?: Hex32;
  newPubkey?: Hex32;
  prepared?: PreparedMigrationV3State;
  preparedAdvice?: PreparedMigrationAdvice;
  preparedRelayReport?: PreparedMigrationRelayReport;
  social?: SocialTransitionState;
  socialAdvice?: SocialTransitionAdvice;
  socialWorkflow?: SocialWorkflowReport;
};

export type PreparedScenarioLike = {
  oldPubkey: Hex32;
  events: NostrEvent[];
  otsProofs: NostrEvent[];
};

export type SocialScenarioLike = {
  oldPubkey: Hex32;
  newPubkey: Hex32;
  claims: NostrEvent[];
  attestations: NostrEvent[];
};

export type PublishPlanEntry = {
  step: "prepare" | "update-authority" | "execute" | "claim" | "attest" | "proof";
  event: NostrEvent;
  targetEventId?: EventId;
};

export type PreparedProofArtifactInput = {
  targetEventId?: EventId;
  otsEvent?: NostrEvent;
  otsBytesBase64?: string;
  summary?: OtsProofSummary;
};

export type BundlePublishResult = {
  relays: string[];
  attemptedRelays: string[];
  acceptedRelays: string[];
  rejectedRelays: string[];
  timedOutRelays: string[];
  entries: Array<{
    step: PublishPlanEntry["step"];
    eventId?: EventId;
    kind: number;
    receiptSummary: string;
    receiptCount: number;
    acceptedRelays: string[];
    rejectedRelays: string[];
    timedOutRelays: string[];
  }>;
  failedEntries: Array<{
    step: PublishPlanEntry["step"];
    eventId?: EventId;
    kind: number;
  }>;
  inspection: InspectTransitionResult;
  preparedRelayReport?: PreparedMigrationRelayReport;
  warning?: string;
  warnings: string[];
  skippedProofTargets: EventId[];
};

export type BundleWatchResult = {
  relays: string[];
  targetEventIds: EventId[];
  observedEventIds: EventId[];
  missingEventIds: EventId[];
  timedOut: boolean;
  observedEvents: NostrEvent[];
  finalState: PreparedMigrationV3State | SocialTransitionState | undefined;
  finalInspection: InspectTransitionResult;
};

export type RelayRuntimeLike = {
  openRelaySession: typeof openRelaySession;
  publishEvent: typeof publishEvent;
};

export type OperateTransitionResult = {
  input: {
    effectiveRelays: string[];
    publish: boolean;
    watchSeconds?: number;
  };
  inspection: InspectTransitionResult;
  publishResult?: BundlePublishResult;
  watchResult?: BundleWatchResult;
};

export type PreparedMigrationFlowResult = {
  stage: "prepared_root" | "prepared_enrolled" | "prepared_migrated";
  preparedBundle: PreparedBundle;
  updatedBundle?: PreparedBundle;
  executedBundle?: PreparedBundle;
  preparedState: PreparedMigrationV3State;
  updatedState?: PreparedMigrationV3State;
  executedState?: PreparedMigrationV3State;
  stopReason?: string;
  publishResult?: BundlePublishResult;
  watchResult?: BundleWatchResult;
};

export type PreparedMigrationContinuationSnapshot = {
  label:
    | "input"
    | "root-proof-attached"
    | "authority-updated"
    | "update-proof-attached"
    | "executed";
  bundle: PreparedBundle;
  state: PreparedMigrationV3State;
};

export type PreparedMigrationContinuationResult = {
  finalBundle: PreparedBundle;
  finalState: PreparedMigrationV3State;
  snapshots: PreparedMigrationContinuationSnapshot[];
  stopReason?: string;
  publishResult?: BundlePublishResult;
  watchResult?: BundleWatchResult;
};

export type PreparedWorkflowReport = {
  state: PreparedMigrationV3State;
  advice: PreparedMigrationAdvice;
  relayReport: PreparedMigrationRelayReport;
};

export type SocialWorkflowReport = {
  state: SocialTransitionState;
  claimCount: number;
  attestationCount: number;
  followCount: number;
  trustedCount: number;
  supportCount: number;
  opposeCount: number;
  selfAssertedSupportCount: number;
  selfAssertedOpposeCount: number;
  advice: SocialTransitionAdvice;
};

export type PreparedMigrationAdvice = {
  nextAction:
    | "create_root"
    | "attach_root_proof"
    | "wait_root_confirmation"
    | "repair_root_proof"
    | "add_authority_update"
    | "attach_update_proof"
    | "wait_update_confirmation"
    | "repair_update_proof"
    | "execute"
    | "done"
    | "resolve_conflict"
    | "inspect";
  summary: string;
  missingInputs: string[];
  targetEventId?: EventId;
};

export type SocialTransitionAdvice = {
  nextAction:
    | "publish_claim"
    | "set_viewer_context"
    | "gather_attestations"
    | "review_support"
    | "review_opposition"
    | "review_split";
  summary: string;
  missingInputs: string[];
};

export type PreparedMigrationRelayReport = {
  relayStatus: "fully_relay_replayable" | "partially_local_only";
  publishableEventCount: number;
  publishableProofCount: number;
  localOnlyProofTargets: EventId[];
  summaryOnlyProofTargets: EventId[];
  relayObservableEventIds: EventId[];
  relayObservableProofEventIds: EventId[];
};

export async function cliPrepare(input: {
  oldSecretKey: string;
  migrationSecretKey: string;
  createdAt?: number;
  proof?: { status: "pending" | "bitcoin_confirmed"; anchorHeight?: number };
  proofArtifact?: PreparedProofArtifactInput;
  relays?: string[];
}): Promise<PreparedBundle> {
  const oldSigner = createLocalSigner(input.oldSecretKey);
  const migrationPubkey = deriveSchnorrPublicKey(input.migrationSecretKey);
  const pma = await buildPmaV3({
    oldSigner,
    migrationPubkey,
    createdAt: input.createdAt,
  });
  const otsProofs = input.proofArtifact
    ? [buildPreparedBundleProof(input.proofArtifact, pma.id!)]
    : input.proof
      ? [buildMockPreparedProof(pma, 1776, input.proof)]
      : [];
  return buildPreparedBundle({
    events: [pma],
    otsProofs,
    relays: input.relays,
  });
}

export async function cliUpdateAuthority(input: {
  bundle: PreparedBundle;
  oldSecretKey: string;
  currentMigrationSecretKey: string;
  nextMigrationSecretKey: string;
  createdAt?: number;
  proof?: { status: "pending" | "bitcoin_confirmed"; anchorHeight?: number };
  proofArtifact?: PreparedProofArtifactInput;
  relays?: string[];
}): Promise<PreparedBundle> {
  const resolved = inspectPreparedBundle(input.bundle);
  if (resolved.state !== "prepared_enrolled") {
    throw new Error(`update-authority requires prepared_enrolled state, got ${resolved.state}`);
  }

  const currentMigrationSigner = createLocalSigner(input.currentMigrationSecretKey);
  const nextMigrationPubkey = deriveSchnorrPublicKey(input.nextMigrationSecretKey);
  const pmu = await buildPmuV3({
    oldPubkey: resolved.root.oldPubkey,
    rootAuthorityId: resolved.root.canonicalAuthorityId,
    previousAuthorityId: resolved.activeAuthority.canonicalAuthorityId,
    currentMigrationSigner,
    nextMigrationPubkey,
    oldDetachedSigner: createLocalDetachedSigner(input.oldSecretKey),
    nextDetachedSigner: createLocalDetachedSigner(input.nextMigrationSecretKey),
    createdAt: input.createdAt,
  });
  const proof = input.proofArtifact
    ? [buildPreparedBundleProof(input.proofArtifact, pmu.id!)]
    : input.proof
      ? [buildMockPreparedProof(pmu, 1779, input.proof)]
      : [];
  return buildPreparedBundle({
    events: [...input.bundle.events, pmu],
    otsProofs: [...input.bundle.otsProofs, ...proof],
    relays: [...new Set([...(input.bundle.relays ?? []), ...(input.relays ?? [])])],
  });
}

export async function cliExecute(input: {
  bundle: PreparedBundle;
  activeMigrationSecretKey: string;
  newSecretKey: string;
  createdAt?: number;
  relays?: string[];
}): Promise<PreparedBundle> {
  const resolved = inspectPreparedBundle(input.bundle);
  if (resolved.state !== "prepared_enrolled") {
    throw new Error(`execute requires prepared_enrolled state, got ${resolved.state}`);
  }

  const pmx = await buildPmxV3({
    rootAuthorityId: resolved.root.canonicalAuthorityId,
    authorityId: resolved.activeAuthority.canonicalAuthorityId,
    oldPubkey: resolved.root.oldPubkey,
    migrationSigner: createLocalSigner(input.activeMigrationSecretKey),
    newSigner: createLocalSigner(input.newSecretKey),
    createdAt: input.createdAt,
  });

  return buildPreparedBundle({
    events: [...input.bundle.events, pmx],
    otsProofs: [...input.bundle.otsProofs],
    relays: [...new Set([...(input.bundle.relays ?? []), ...(input.relays ?? [])])],
  });
}

export async function cliCreateSocialClaim(input: {
  oldPubkey: Hex32;
  newPubkey: Hex32;
  signerSecretKey: string;
  content?: string;
  createdAt?: number;
  bundle?: SocialBundle;
  relays?: string[];
}): Promise<SocialBundle> {
  const claim = await buildSocialClaim({
    oldPubkey: input.oldPubkey,
    newPubkey: input.newPubkey,
    signer: createLocalSigner(input.signerSecretKey),
    content: input.content,
    createdAt: input.createdAt,
  });

  return buildSocialBundle({
    oldPubkey: input.oldPubkey,
    newPubkey: input.newPubkey,
    events: [...(input.bundle?.events ?? []), claim],
    relays: [...new Set([...(input.bundle?.relays ?? []), ...(input.relays ?? [])])],
  });
}

export async function cliCreateSocialAttestation(input: {
  oldPubkey: Hex32;
  newPubkey: Hex32;
  signerSecretKey: string;
  stance: "support" | "oppose" | "uncertain";
  method?: "in_person" | "video" | "voice" | "website" | "nip05" | "chat" | "other";
  content?: string;
  referencedClaimIds?: string[];
  createdAt?: number;
  bundle?: SocialBundle;
  relays?: string[];
}): Promise<SocialBundle> {
  const attestation = await buildSocialAttestation({
    oldPubkey: input.oldPubkey,
    newPubkey: input.newPubkey,
    attestorSigner: createLocalSigner(input.signerSecretKey),
    stance: input.stance,
    method: input.method,
    content: input.content,
    referencedClaimIds: input.referencedClaimIds,
    createdAt: input.createdAt,
  });

  return buildSocialBundle({
    oldPubkey: input.oldPubkey,
    newPubkey: input.newPubkey,
    events: [...(input.bundle?.events ?? []), attestation],
    relays: [...new Set([...(input.bundle?.relays ?? []), ...(input.relays ?? [])])],
  });
}

export async function cliRunPreparedMigrationFlow(input: {
  oldSecretKey: string;
  migrationSecretKey: string;
  nextMigrationSecretKey: string;
  newSecretKey: string;
  rootProof?: { status: "pending" | "bitcoin_confirmed"; anchorHeight?: number };
  rootProofArtifact?: PreparedProofArtifactInput;
  updateProof?: { status: "pending" | "bitcoin_confirmed"; anchorHeight?: number };
  updateProofArtifact?: PreparedProofArtifactInput;
  createdAtStart?: number;
  relays?: string[];
  publish?: boolean;
  requireFullyRelayReplayable?: boolean;
  watchSeconds?: number;
  relayRuntime?: RelayRuntimeLike;
}): Promise<PreparedMigrationFlowResult> {
  const preparedBundle = await cliPrepare({
    oldSecretKey: input.oldSecretKey,
    migrationSecretKey: input.migrationSecretKey,
    createdAt: input.createdAtStart,
    proof: input.rootProof,
    proofArtifact: input.rootProofArtifact,
    relays: input.relays,
  });
  const preparedState = inspectPreparedBundle(preparedBundle);
  const initialMigrationPubkey = deriveSchnorrPublicKey(input.migrationSecretKey);
  if (
    preparedState.state !== "prepared_enrolled" ||
    preparedState.activeAuthority.migrationPubkey !== initialMigrationPubkey
  ) {
    return {
      stage: "prepared_root",
      preparedBundle,
      preparedState,
      stopReason:
        preparedState.state !== "prepared_enrolled"
          ? `root stage did not reach prepared_enrolled; got ${preparedState.state}`
          : "root stage does not leave the initial migration key active",
    };
  }

  const updatedBundle = await cliUpdateAuthority({
    bundle: preparedBundle,
    oldSecretKey: input.oldSecretKey,
    currentMigrationSecretKey: input.migrationSecretKey,
    nextMigrationSecretKey: input.nextMigrationSecretKey,
    createdAt: incrementCreatedAt(input.createdAtStart, 100),
    proof: input.updateProof,
    proofArtifact: input.updateProofArtifact,
    relays: input.relays,
  });
  const updatedState = inspectPreparedBundle(updatedBundle);
  const nextMigrationPubkey = deriveSchnorrPublicKey(input.nextMigrationSecretKey);
  if (
    updatedState.state !== "prepared_enrolled" ||
    updatedState.activeAuthority.migrationPubkey !== nextMigrationPubkey
  ) {
    return {
      stage: "prepared_enrolled",
      preparedBundle,
      updatedBundle,
      preparedState,
      updatedState,
      stopReason:
        updatedState.state !== "prepared_enrolled"
          ? `update stage did not keep prepared_enrolled; got ${updatedState.state}`
          : "update stage did not activate the next migration key, likely because the update proof is still missing or unconfirmed",
    };
  }

  const executedBundle = await cliExecute({
    bundle: updatedBundle,
    activeMigrationSecretKey: input.nextMigrationSecretKey,
    newSecretKey: input.newSecretKey,
    createdAt: incrementCreatedAt(input.createdAtStart, 200),
    relays: input.relays,
  });
  const executedState = inspectPreparedBundle(executedBundle);

  const result: PreparedMigrationFlowResult = {
    stage: executedState.state === "prepared_migrated" ? "prepared_migrated" : "prepared_enrolled",
    preparedBundle,
    updatedBundle,
    executedBundle,
    preparedState,
    updatedState,
    executedState,
    stopReason:
      executedState.state === "prepared_migrated"
        ? undefined
        : `execute stage did not reach prepared_migrated; got ${executedState.state}`,
  };

  if (input.publish) {
    result.publishResult = await cliPublishBundle({
      preparedBundle: executedBundle,
      relays: input.relays,
      requireFullyRelayReplayable: input.requireFullyRelayReplayable,
      relayRuntime: input.relayRuntime,
    });

    if ((input.watchSeconds ?? 0) > 0) {
      result.watchResult = await cliWatchBundle({
        preparedBundle: executedBundle,
        relays: input.relays,
        watchSeconds: input.watchSeconds,
        relayRuntime: input.relayRuntime,
      });
    }
  }

  return result;
}

export async function cliContinuePreparedMigration(input: {
  bundle: PreparedBundle;
  oldSecretKey?: string;
  currentMigrationSecretKey?: string;
  nextMigrationSecretKey?: string;
  newSecretKey?: string;
  rootProof?: { status: "pending" | "bitcoin_confirmed"; anchorHeight?: number };
  rootProofArtifact?: PreparedProofArtifactInput;
  updateProof?: { status: "pending" | "bitcoin_confirmed"; anchorHeight?: number };
  updateProofArtifact?: PreparedProofArtifactInput;
  relays?: string[];
  publish?: boolean;
  requireFullyRelayReplayable?: boolean;
  watchSeconds?: number;
  relayRuntime?: RelayRuntimeLike;
}): Promise<PreparedMigrationContinuationResult> {
  let currentBundle = input.bundle;
  let currentState = inspectPreparedBundle(currentBundle);
  const snapshots: PreparedMigrationContinuationSnapshot[] = [
    {
      label: "input",
      bundle: currentBundle,
      state: currentState,
    },
  ];

  if (input.rootProof || input.rootProofArtifact) {
    const rootTarget = getSinglePreparedEventByKind(currentBundle, 1776);
    if (!rootTarget) {
      return {
        finalBundle: currentBundle,
        finalState: currentState,
        snapshots,
        stopReason: "cannot attach a root proof because the bundle does not contain exactly one PMA root event",
      };
    }

    currentBundle = cliAttachPreparedProof({
      bundle: currentBundle,
      artifact: input.rootProofArtifact
        ? {
            ...input.rootProofArtifact,
            targetEventId: input.rootProofArtifact.targetEventId ?? rootTarget.id!,
          }
        : {
            targetEventId: rootTarget.id!,
            otsEvent: undefined,
            otsBytesBase64: undefined,
            summary: undefined,
          },
    });

    if (input.rootProof) {
      currentBundle = replaceLastPreparedProofWithMockProof(currentBundle, rootTarget, 1776, input.rootProof);
    }

    currentState = inspectPreparedBundle(currentBundle);
    snapshots.push({
      label: "root-proof-attached",
      bundle: currentBundle,
      state: currentState,
    });
  }

  if (currentState.state === "prepared_migrated") {
    return maybePublishPreparedContinuation({
      result: {
        finalBundle: currentBundle,
        finalState: currentState,
        snapshots,
      },
      publish: input.publish,
      requireFullyRelayReplayable: input.requireFullyRelayReplayable,
      watchSeconds: input.watchSeconds,
      relays: input.relays,
      relayRuntime: input.relayRuntime,
    });
  }

  const latestPmu = getLatestPreparedEventByKind(currentBundle, 1779);
  if (!latestPmu) {
    if (currentState.state !== "prepared_enrolled") {
      return {
        finalBundle: currentBundle,
        finalState: currentState,
        snapshots,
        stopReason: `bundle is not ready for authority update; current state is ${currentState.state}`,
      };
    }

    if (!input.oldSecretKey || !input.currentMigrationSecretKey || !input.nextMigrationSecretKey) {
      return {
        finalBundle: currentBundle,
        finalState: currentState,
        snapshots,
        stopReason:
          "bundle is root-confirmed but cannot add a PMU without --old-secret, --current-migration-secret, and --next-migration-secret",
      };
    }

    currentBundle = await cliUpdateAuthority({
      bundle: currentBundle,
      oldSecretKey: input.oldSecretKey,
      currentMigrationSecretKey: input.currentMigrationSecretKey,
      nextMigrationSecretKey: input.nextMigrationSecretKey,
      createdAt: nextCreatedAtAfterBundle(currentBundle),
      relays: input.relays,
    });
    currentState = inspectPreparedBundle(currentBundle);
    snapshots.push({
      label: "authority-updated",
      bundle: currentBundle,
      state: currentState,
    });
  }

  const pendingUpdateTarget = getLatestPreparedEventByKind(currentBundle, 1779);
  if ((input.updateProof || input.updateProofArtifact) && pendingUpdateTarget) {
    currentBundle = cliAttachPreparedProof({
      bundle: currentBundle,
      artifact: input.updateProofArtifact
        ? {
            ...input.updateProofArtifact,
            targetEventId: input.updateProofArtifact.targetEventId ?? pendingUpdateTarget.id!,
          }
        : {
            targetEventId: pendingUpdateTarget.id!,
            otsEvent: undefined,
            otsBytesBase64: undefined,
            summary: undefined,
          },
    });

    if (input.updateProof) {
      currentBundle = replaceLastPreparedProofWithMockProof(currentBundle, pendingUpdateTarget, 1779, input.updateProof);
    }

    currentState = inspectPreparedBundle(currentBundle);
    snapshots.push({
      label: "update-proof-attached",
      bundle: currentBundle,
      state: currentState,
    });
  }

  if (currentState.state === "prepared_migrated") {
    return maybePublishPreparedContinuation({
      result: {
        finalBundle: currentBundle,
        finalState: currentState,
        snapshots,
      },
      publish: input.publish,
      requireFullyRelayReplayable: input.requireFullyRelayReplayable,
      watchSeconds: input.watchSeconds,
      relays: input.relays,
      relayRuntime: input.relayRuntime,
    });
  }

  if (currentState.state !== "prepared_enrolled") {
    return {
      finalBundle: currentBundle,
      finalState: currentState,
      snapshots,
      stopReason: `bundle is not ready to execute; current state is ${currentState.state}`,
    };
  }

  if (currentBundle.events.some((event) => event.kind === 1777)) {
    return {
      finalBundle: currentBundle,
      finalState: currentState,
      snapshots,
      stopReason: `bundle already contains an execution event but resolved state is ${currentState.state}`,
    };
  }

  const latestResolvedPmu = getLatestPreparedEventByKind(currentBundle, 1779);
  if (
    latestResolvedPmu &&
    currentState.activeAuthority.canonicalAuthorityId !== latestResolvedPmu.id
  ) {
    return {
      finalBundle: currentBundle,
      finalState: currentState,
      snapshots,
      stopReason:
        "bundle contains a PMU that has not become active yet, likely because its proof is still missing or unconfirmed",
    };
  }

  if (!input.newSecretKey) {
    return {
      finalBundle: currentBundle,
      finalState: currentState,
      snapshots,
      stopReason: "bundle is ready to execute but --new-secret was not provided",
    };
  }

  const activeMigrationSecretKey = resolveActiveMigrationSecretKey(currentState, input);
  if (!activeMigrationSecretKey) {
    return {
      finalBundle: currentBundle,
      finalState: currentState,
      snapshots,
      stopReason:
        "bundle is ready to execute but the active migration pubkey does not match any provided migration secret",
    };
  }

  currentBundle = await cliExecute({
    bundle: currentBundle,
    activeMigrationSecretKey,
    newSecretKey: input.newSecretKey,
    createdAt: nextCreatedAtAfterBundle(currentBundle),
    relays: input.relays,
  });
  currentState = inspectPreparedBundle(currentBundle);
  snapshots.push({
    label: "executed",
    bundle: currentBundle,
    state: currentState,
  });

  return maybePublishPreparedContinuation({
    result: {
      finalBundle: currentBundle,
      finalState: currentState,
      snapshots,
      stopReason:
        currentState.state === "prepared_migrated"
          ? undefined
          : `execute stage did not reach prepared_migrated; got ${currentState.state}`,
    },
    publish: input.publish,
    requireFullyRelayReplayable: input.requireFullyRelayReplayable,
    watchSeconds: input.watchSeconds,
    relays: input.relays,
    relayRuntime: input.relayRuntime,
  });
}

export async function cliInspectTransition(input: {
  preparedBundle?: PreparedBundle;
  socialBundle?: SocialBundle;
  viewerFollowSet?: Set<Hex32>;
  viewerTrustedSet?: Set<Hex32>;
}): Promise<InspectTransitionResult> {
  const prepared = input.preparedBundle ? inspectPreparedBundle(input.preparedBundle) : undefined;
  const oldPubkey = input.preparedBundle?.oldPubkey ?? input.socialBundle?.oldPubkey;
  const newPubkey =
    input.socialBundle?.newPubkey ??
    (prepared?.state === "prepared_migrated" ? prepared.newPubkey : undefined);

  const socialWorkflow =
    input.socialBundle && oldPubkey && newPubkey
      ? await summarizeSocialWorkflow({
          socialBundle: input.socialBundle,
          viewerFollowSet: input.viewerFollowSet,
          viewerTrustedSet: input.viewerTrustedSet,
        })
      : undefined;

  return {
    oldPubkey,
    newPubkey,
    prepared,
    preparedAdvice: input.preparedBundle ? advisePreparedMigration(input.preparedBundle, prepared) : undefined,
    preparedRelayReport: input.preparedBundle ? summarizePreparedMigrationRelayReport(input.preparedBundle) : undefined,
    social: socialWorkflow?.state,
    socialAdvice: socialWorkflow?.advice,
    socialWorkflow,
  };
}

export function inspectPreparedBundle(bundle: PreparedBundle): PreparedMigrationV3State {
  return resolvePreparedMigrationV3({
    oldPubkey: bundle.oldPubkey,
    events: bundle.events,
    proofs: summarizePreparedBundleProofs(bundle),
  });
}

export function summarizePreparedWorkflow(bundle: PreparedBundle): PreparedWorkflowReport {
  const state = inspectPreparedBundle(bundle);
  return {
    state,
    advice: advisePreparedMigration(bundle, state),
    relayReport: summarizePreparedMigrationRelayReport(bundle),
  };
}

export async function summarizeSocialWorkflow(input: {
  socialBundle: SocialBundle;
  viewerFollowSet?: Set<Hex32>;
  viewerTrustedSet?: Set<Hex32>;
}): Promise<SocialWorkflowReport> {
  const claims = input.socialBundle.events.filter((event) => event.kind === 1778);
  const attestations = input.socialBundle.events.filter((event) => event.kind === 31778);
  const state = await resolveSocialTransition({
    viewerFollowSet: input.viewerFollowSet ?? new Set<Hex32>(),
    viewerTrustedSet: input.viewerTrustedSet,
    oldPubkey: input.socialBundle.oldPubkey,
    newPubkey: input.socialBundle.newPubkey,
    claims,
    attestations,
  });

  const supportCount = "supportPubkeys" in state ? state.supportPubkeys.length : 0;
  const opposeCount = "opposePubkeys" in state ? state.opposePubkeys.length : 0;
  const selfAssertedSupportCount =
    "selfAssertedSupportPubkeys" in state ? state.selfAssertedSupportPubkeys.length : 0;
  const selfAssertedOpposeCount =
    "selfAssertedOpposePubkeys" in state ? state.selfAssertedOpposePubkeys.length : 0;
  const followCount = input.viewerFollowSet?.size ?? 0;
  const trustedCount = input.viewerTrustedSet?.size ?? 0;

  return {
    state,
    claimCount: claims.length,
    attestationCount: attestations.length,
    followCount,
    trustedCount,
    supportCount,
    opposeCount,
    selfAssertedSupportCount,
    selfAssertedOpposeCount,
    advice: adviseSocialTransition({
      state,
      followCount,
      trustedCount,
      supportCount,
      opposeCount,
    }),
  };
}

export function selectLatestPreparedSnapshotName(entries: string[]): string | undefined {
  return listPreparedSnapshotNamesDescending(entries).at(0);
}

export function listPreparedSnapshotNamesDescending(entries: string[]): string[] {
  const namedOrders = new Map<string, number>([
    ["prepared-root.json", 0],
    ["prepared-updated.json", 1],
    ["prepared-executed.json", 2],
  ]);

  return [...entries]
    .map((entry) => {
      const match = /^(\d+)-.+\.json$/.exec(entry);
      if (match) {
        return { entry, order: Number(match[1]) };
      }

      const namedOrder = namedOrders.get(entry);
      return namedOrder === undefined ? undefined : { entry, order: namedOrder };
    })
    .filter((entry): entry is { entry: string; order: number } => Boolean(entry))
    .sort((left, right) => right.order - left.order || left.entry.localeCompare(right.entry))
    .map((entry) => entry.entry);
}

export function selectLatestSocialSnapshotName(entries: string[]): string | undefined {
  return listSocialSnapshotNamesDescending(entries).at(0);
}

export function listSocialSnapshotNamesDescending(entries: string[]): string[] {
  const namedOrders = new Map<string, number>([
    ["social-claimed.json", 0],
    ["social-attested.json", 1],
  ]);

  return [...entries]
    .map((entry) => {
      const match = /^(\d+)-.+\.json$/.exec(entry);
      if (match) {
        return { entry, order: Number(match[1]) };
      }

      const namedOrder = namedOrders.get(entry);
      return namedOrder === undefined ? undefined : { entry, order: namedOrder };
    })
    .filter((entry): entry is { entry: string; order: number } => Boolean(entry))
    .sort((left, right) => right.order - left.order || left.entry.localeCompare(right.entry))
    .map((entry) => entry.entry);
}

export function readPreparedBundle(text: string): PreparedBundle {
  return parsePreparedBundle(text);
}

export function readSocialBundle(text: string): SocialBundle {
  return parseSocialBundle(text);
}

export function writePreparedBundle(bundle: PreparedBundle): string {
  return serializePreparedBundle(bundle);
}

export function writeSocialBundle(bundle: SocialBundle): string {
  return serializeSocialBundle(bundle);
}

export function summarizePreparedBundleProofs(bundle: PreparedBundle): OtsProofSummary[] {
  return bundle.otsProofs.map((entry) => {
    if (entry.summary) {
      return entry.summary;
    }

    if (entry.otsEvent) {
      return summarizeOtsProofEventForV3(entry.otsEvent);
    }

    return {
      ok: false,
      code: "missing_proof_artifact",
      reason: `prepared bundle proof for target ${entry.targetEventId} is missing otsEvent and summary`,
    };
  });
}

export function buildPreparedBundleFromScenario(
  scenario: PreparedScenarioLike,
  relays?: string[],
): PreparedBundle {
  return buildPreparedBundle({
    events: scenario.events,
    otsProofs: scenario.otsProofs.map((otsEvent) => ({
      targetEventId: readProofTargetEventId(otsEvent),
      otsEvent,
      otsBytesBase64: otsEvent.content,
      summary: summarizeOtsProofEventForV3(otsEvent),
    })),
    relays,
  });
}

export function buildSocialBundleFromScenario(scenario: SocialScenarioLike): SocialBundle {
  return buildSocialBundle({
    oldPubkey: scenario.oldPubkey,
    newPubkey: scenario.newPubkey,
    events: [...scenario.claims, ...scenario.attestations],
  });
}

export function resolveSocialTransitionPubkeys(input: {
  preparedBundle?: PreparedBundle;
  socialBundle?: SocialBundle;
  oldPubkey?: Hex32;
  newPubkey?: Hex32;
}): { oldPubkey: Hex32; newPubkey: Hex32 } {
  if (input.preparedBundle) {
    const preparedState = inspectPreparedBundle(input.preparedBundle);
    if (preparedState.state !== "prepared_migrated") {
      throw new Error(
        `social commands can only derive transition pubkeys from a prepared_migrated bundle, got ${preparedState.state}`,
      );
    }

    if (input.oldPubkey && input.oldPubkey !== input.preparedBundle.oldPubkey) {
      throw new Error("provided --old-pubkey does not match the prepared bundle old pubkey");
    }

    if (input.newPubkey && input.newPubkey !== preparedState.newPubkey) {
      throw new Error("provided --new-pubkey does not match the prepared bundle successor pubkey");
    }

    return {
      oldPubkey: input.preparedBundle.oldPubkey,
      newPubkey: preparedState.newPubkey,
    };
  }

  if (input.socialBundle) {
    if (input.oldPubkey && input.oldPubkey !== input.socialBundle.oldPubkey) {
      throw new Error("provided --old-pubkey does not match the social bundle old pubkey");
    }

    if (input.newPubkey && input.newPubkey !== input.socialBundle.newPubkey) {
      throw new Error("provided --new-pubkey does not match the social bundle new pubkey");
    }

    return {
      oldPubkey: input.socialBundle.oldPubkey,
      newPubkey: input.socialBundle.newPubkey,
    };
  }

  if (!input.oldPubkey || !input.newPubkey) {
    throw new Error(
      "social commands require --old-pubkey and --new-pubkey unless --prepared-bundle, --prepared-bundle-dir, --bundle, or --bundle-dir is provided",
    );
  }

  return {
    oldPubkey: input.oldPubkey,
    newPubkey: input.newPubkey,
  };
}

export function buildPreparedPublishPlan(bundle: PreparedBundle): PublishPlanEntry[] {
  const proofsByTarget = new Map<EventId, NostrEvent[]>();
  for (const proof of bundle.otsProofs) {
    if (!proof.otsEvent) {
      continue;
    }

    const entries = proofsByTarget.get(proof.targetEventId) ?? [];
    entries.push(proof.otsEvent);
    proofsByTarget.set(proof.targetEventId, entries);
  }

  const entries: PublishPlanEntry[] = [];
  for (const event of [...bundle.events].sort(comparePreparedEvents)) {
    entries.push({
      step: describePreparedStep(event.kind),
      event,
    });

    for (const proof of [...(proofsByTarget.get(event.id!) ?? [])].sort(compareEvents)) {
      entries.push({
        step: "proof",
        event: proof,
        targetEventId: event.id!,
      });
    }
  }

  return entries;
}

export function buildSocialPublishPlan(bundle: SocialBundle): PublishPlanEntry[] {
  return [...bundle.events]
    .sort(compareEvents)
    .map((event) => ({
      step: event.kind === 1778 ? ("claim" as const) : ("attest" as const),
      event,
    }));
}

export function buildBundlePublishPlan(input: {
  preparedBundle?: PreparedBundle;
  socialBundle?: SocialBundle;
}): PublishPlanEntry[] {
  return [
    ...(input.preparedBundle ? buildPreparedPublishPlan(input.preparedBundle) : []),
    ...(input.socialBundle ? buildSocialPublishPlan(input.socialBundle) : []),
  ];
}

export function cliAttachPreparedProof(input: {
  bundle: PreparedBundle;
  artifact: PreparedProofArtifactInput;
}): PreparedBundle {
  const proof = buildPreparedBundleProof(input.artifact);
  const targetExists = input.bundle.events.some((event) => event.id === proof.targetEventId);
  if (!targetExists) {
    throw new Error(`prepared bundle does not contain target event ${proof.targetEventId}`);
  }

  return buildPreparedBundle({
    events: input.bundle.events,
    otsProofs: [...input.bundle.otsProofs, proof],
    relays: input.bundle.relays,
  });
}

export function buildPreparedBundleSubscriptionFilters(bundle: PreparedBundle): NostrRelayFilter[] {
  const protocolEventIds = bundle.events.map((event) => event.id!).filter(Boolean);
  const proofEventIds = bundle.otsProofs.flatMap((entry) => (entry.otsEvent?.id ? [entry.otsEvent.id] : []));

  return [
    ...(protocolEventIds.length > 0 ? [{ ids: protocolEventIds }] : []),
    ...(proofEventIds.length > 0 ? [{ ids: proofEventIds }] : []),
  ];
}

export function buildSocialBundleSubscriptionFilters(bundle: SocialBundle): NostrRelayFilter[] {
  const eventIds = bundle.events.map((event) => event.id!).filter(Boolean);
  return eventIds.length > 0 ? [{ ids: eventIds }] : [];
}

export function buildBundleSubscriptionFilters(input: {
  preparedBundle?: PreparedBundle;
  socialBundle?: SocialBundle;
}): NostrRelayFilter[] {
  return [
    ...(input.preparedBundle ? buildPreparedBundleSubscriptionFilters(input.preparedBundle) : []),
    ...(input.socialBundle ? buildSocialBundleSubscriptionFilters(input.socialBundle) : []),
  ];
}

export async function cliPublishBundle(input: {
  preparedBundle?: PreparedBundle;
  socialBundle?: SocialBundle;
  relays?: string[];
  settleMs?: number;
  requireFullyRelayReplayable?: boolean;
  relayRuntime?: RelayRuntimeLike;
}): Promise<BundlePublishResult> {
  const preparedRelayReport = input.preparedBundle
    ? summarizePreparedMigrationRelayReport(input.preparedBundle)
    : undefined;
  const inspection = await cliInspectTransition({
    preparedBundle: input.preparedBundle,
    socialBundle: input.socialBundle,
  });
  if (
    input.requireFullyRelayReplayable &&
    preparedRelayReport &&
    preparedRelayReport.relayStatus !== "fully_relay_replayable"
  ) {
    throw new Error(
      `prepared bundle is not fully relay-replayable; local-only proof targets: ${preparedRelayReport.localOnlyProofTargets.join(",")}`,
    );
  }

  const relays = resolveRelayList(input.relays, input.preparedBundle?.relays ?? input.socialBundle?.relays);
  const publishPlan = buildBundlePublishPlan({
    preparedBundle: input.preparedBundle,
    socialBundle: input.socialBundle,
  });
  const skippedProofTargets = input.preparedBundle
    ? input.preparedBundle.otsProofs
        .filter((entry) => !entry.otsEvent)
        .map((entry) => entry.targetEventId)
    : [];

  const relayRuntime = input.relayRuntime ?? { openRelaySession, publishEvent };
  const session = await relayRuntime.openRelaySession({ relays });
  try {
    const entries = [];
    const publishWarnings: string[] = [];
    for (const entry of publishPlan) {
      const receipts = await relayRuntime.publishEvent(session, entry.event, input.settleMs ?? 1200);
      const receiptOutcome = summarizeRelayReceipts(session.relays, receipts);
      if (receiptOutcome.acceptedRelays.length === 0) {
        publishWarnings.push(`no relay accepted ${entry.step} event ${entry.event.id ?? "(missing-id)"}`);
      } else if (receiptOutcome.rejectedRelays.length > 0 || receiptOutcome.timedOutRelays.length > 0) {
        publishWarnings.push(
          `${entry.step} event ${entry.event.id ?? "(missing-id)"} reached only ${receiptOutcome.acceptedRelays.length}/${session.relays.length} relays`,
        );
      }
      entries.push({
        step: entry.step,
        eventId: entry.event.id,
        kind: entry.event.kind,
        receiptSummary: formatReceiptSummary(receipts),
        receiptCount: receipts.length,
        acceptedRelays: receiptOutcome.acceptedRelays,
        rejectedRelays: receiptOutcome.rejectedRelays,
        timedOutRelays: receiptOutcome.timedOutRelays,
      });
    }

    const overallOutcome = summarizeRelayReceipts(session.relays, session.receipts);
    const failedEntries = entries
      .filter((entry) => entry.acceptedRelays.length === 0)
      .map((entry) => ({
        step: entry.step,
        eventId: entry.eventId,
        kind: entry.kind,
      }));

    const relayWarnings = [
      ...(preparedRelayReport?.relayStatus === "partially_local_only"
        ? [
            `prepared bundle includes local-only proof evidence for targets ${preparedRelayReport.localOnlyProofTargets.join(",")}; only raw proof events were published`,
          ]
        : []),
      ...publishWarnings,
    ];

    return {
      relays: session.relays,
      attemptedRelays: overallOutcome.attemptedRelays,
      acceptedRelays: overallOutcome.acceptedRelays,
      rejectedRelays: overallOutcome.rejectedRelays,
      timedOutRelays: overallOutcome.timedOutRelays,
      entries,
      failedEntries,
      inspection,
      preparedRelayReport,
      warning: relayWarnings[0],
      warnings: relayWarnings,
      skippedProofTargets,
    };
  } finally {
    session.close();
  }
}

export async function cliWatchBundle(input: {
  preparedBundle?: PreparedBundle;
  socialBundle?: SocialBundle;
  viewerFollowSet?: Set<Hex32>;
  viewerTrustedSet?: Set<Hex32>;
  relays?: string[];
  watchSeconds?: number;
  onEvent?: (event: NostrEvent, stateText?: string) => void | Promise<void>;
  relayRuntime?: RelayRuntimeLike;
}): Promise<BundleWatchResult> {
  const relays = resolveRelayList(input.relays, input.preparedBundle?.relays ?? input.socialBundle?.relays);
  const filters = buildBundleSubscriptionFilters({
    preparedBundle: input.preparedBundle,
    socialBundle: input.socialBundle,
  });

  const relayRuntime = input.relayRuntime ?? { openRelaySession, publishEvent };
  let observedEvents: NostrEvent[] = [];
  const session = await relayRuntime.openRelaySession({
    relays,
    onEvent: async (event) => {
      observedEvents = [event, ...observedEvents.filter((entry) => entry.id !== event.id)];
      const result = await inspectObservedBundleState({
        preparedBundle: input.preparedBundle,
        socialBundle: input.socialBundle,
        observedEvents,
        viewerFollowSet: input.viewerFollowSet,
        viewerTrustedSet: input.viewerTrustedSet,
      });
      const stateText = formatObservedStateText(result);
      await input.onEvent?.(event, stateText);
    },
  });
  observedEvents = [...session.observedEvents];

  try {
    subscribeSessionToFilters(session.sockets, filters);
    await Bun.sleep((input.watchSeconds ?? 8) * 1000);
    const finalInspection = await inspectObservedBundleState({
      preparedBundle: input.preparedBundle,
      socialBundle: input.socialBundle,
      observedEvents: session.observedEvents,
      viewerFollowSet: input.viewerFollowSet,
      viewerTrustedSet: input.viewerTrustedSet,
    });

    const targetEventIds = uniqueEventIds(filters.flatMap((filter) => filter.ids ?? []));
    const observedEventIds = uniqueEventIds(session.observedEvents.map((event) => event.id).filter(Boolean) as EventId[]);
    const missingEventIds = targetEventIds.filter((eventId) => !observedEventIds.includes(eventId));

    return {
      relays: session.relays,
      targetEventIds,
      observedEventIds,
      missingEventIds,
      timedOut: missingEventIds.length > 0,
      observedEvents: [...session.observedEvents],
      finalState: finalInspection.prepared ?? finalInspection.social,
      finalInspection,
    };
  } finally {
    session.close();
  }
}

export async function cliOperateTransition(input: {
  preparedBundle: PreparedBundle;
  socialBundle?: SocialBundle;
  viewerFollowSet?: Set<Hex32>;
  viewerTrustedSet?: Set<Hex32>;
  relays?: string[];
  publish?: boolean;
  watchSeconds?: number;
  requireFullyRelayReplayable?: boolean;
  relayRuntime?: RelayRuntimeLike;
  onWatchEvent?: (event: NostrEvent, stateText?: string) => void | Promise<void>;
}): Promise<OperateTransitionResult> {
  const effectiveRelays = resolveRelayList(input.relays, mergeRelayHints(input.preparedBundle.relays, input.socialBundle?.relays));
  const inspection = await cliInspectTransition({
    preparedBundle: input.preparedBundle,
    socialBundle: input.socialBundle,
    viewerFollowSet: input.viewerFollowSet,
    viewerTrustedSet: input.viewerTrustedSet,
  });

  const result: OperateTransitionResult = {
    input: {
      effectiveRelays,
      publish: input.publish ?? false,
      watchSeconds: input.watchSeconds,
    },
    inspection,
  };

  if (input.publish) {
    result.publishResult = await cliPublishBundle({
      preparedBundle: input.preparedBundle,
      socialBundle: input.socialBundle,
      relays: effectiveRelays,
      requireFullyRelayReplayable: input.requireFullyRelayReplayable,
      relayRuntime: input.relayRuntime,
    });
  }

  if (input.watchSeconds !== undefined) {
    result.watchResult = await cliWatchBundle({
      preparedBundle: input.preparedBundle,
      socialBundle: input.socialBundle,
      relays: effectiveRelays,
      watchSeconds: input.watchSeconds,
      viewerFollowSet: input.viewerFollowSet,
      viewerTrustedSet: input.viewerTrustedSet,
      relayRuntime: input.relayRuntime,
      onEvent: input.onWatchEvent,
    });
  }

  return result;
}

export function formatOperateTransitionResult(result: OperateTransitionResult): string {
  const lines = [`effective_relays=${result.input.effectiveRelays.join(",") || "(none)"}`];
  if (result.publishResult) {
    lines.push(`published_events=${result.publishResult.entries.length}`);
  }
  if (result.watchResult) {
    lines.push(`watched_events=${result.watchResult.observedEvents.length}`);
  }
  lines.push("", formatInspectResult(result.inspection));
  return lines.join("\n");
}

export function formatInspectResult(result: InspectTransitionResult): string {
  const lines = [
    "# pubSwitch transition inspection",
    "",
    `old_pubkey=${result.oldPubkey ?? "(unknown)"}`,
    `new_pubkey=${result.newPubkey ?? "(unknown)"}`,
    `prepared_state=${result.prepared?.state ?? "none"}`,
    `social_state=${result.social?.state ?? "none"}`,
  ];

  if (result.prepared?.state === "prepared_enrolled") {
    lines.push(`active_migration=${result.prepared.activeAuthority.migrationPubkey}`);
  }

  if (result.prepared?.state === "prepared_migrated") {
    lines.push(`successor=${result.prepared.newPubkey}`);
  }

  if (result.preparedAdvice) {
    lines.push(`next_action=${result.preparedAdvice.nextAction}`);
    lines.push(`next_action_summary=${result.preparedAdvice.summary}`);
    if (result.preparedAdvice.targetEventId) {
      lines.push(`next_action_target=${result.preparedAdvice.targetEventId}`);
    }
    if (result.preparedAdvice.missingInputs.length > 0) {
      lines.push(`missing_inputs=${result.preparedAdvice.missingInputs.join(",")}`);
    }
  }

  if (result.preparedRelayReport) {
    lines.push(`relay_status=${result.preparedRelayReport.relayStatus}`);
    lines.push(`publishable_events=${result.preparedRelayReport.publishableEventCount}`);
    lines.push(`publishable_proofs=${result.preparedRelayReport.publishableProofCount}`);
    if (result.preparedRelayReport.localOnlyProofTargets.length > 0) {
      lines.push(`local_only_proof_targets=${result.preparedRelayReport.localOnlyProofTargets.join(",")}`);
    }
    if (result.preparedRelayReport.summaryOnlyProofTargets.length > 0) {
      lines.push(`summary_only_proof_targets=${result.preparedRelayReport.summaryOnlyProofTargets.join(",")}`);
    }
  }

  if (result.socialWorkflow) {
    lines.push(`social_claims=${result.socialWorkflow.claimCount}`);
    lines.push(`social_attestations=${result.socialWorkflow.attestationCount}`);
    lines.push(`social_follow_count=${result.socialWorkflow.followCount}`);
    lines.push(`social_trusted_count=${result.socialWorkflow.trustedCount}`);
    lines.push(`social_support_count=${result.socialWorkflow.supportCount}`);
    lines.push(`social_oppose_count=${result.socialWorkflow.opposeCount}`);
    lines.push(`social_self_asserted_support_count=${result.socialWorkflow.selfAssertedSupportCount}`);
    lines.push(`social_self_asserted_oppose_count=${result.socialWorkflow.selfAssertedOpposeCount}`);
  }

  if (result.socialAdvice) {
    lines.push(`social_next_action=${result.socialAdvice.nextAction}`);
    lines.push(`social_next_action_summary=${result.socialAdvice.summary}`);
    if (result.socialAdvice.missingInputs.length > 0) {
      lines.push(`social_missing_inputs=${result.socialAdvice.missingInputs.join(",")}`);
    }
  }

  return lines.join("\n");
}

export function adviseSocialTransition(input: {
  state: SocialTransitionState;
  followCount: number;
  trustedCount: number;
  supportCount: number;
  opposeCount: number;
}): SocialTransitionAdvice {
  if (input.state.state === "none") {
    return {
      nextAction: "publish_claim",
      summary: "no valid social claim is visible yet; publish a claim before asking observers to attest",
      missingInputs: ["signer-secret"],
    };
  }

  if (input.state.state === "claimed") {
    if (input.followCount === 0 && input.trustedCount === 0) {
      return {
        nextAction: "set_viewer_context",
        summary: "the claim exists, but the viewer follow/trusted sets are empty so third-party posture cannot be evaluated yet",
        missingInputs: ["follow-pubkeys-or-trusted-pubkeys"],
      };
    }

    return {
      nextAction: "gather_attestations",
      summary: "the claim exists, but no followed or trusted third-party support or opposition is visible yet",
      missingInputs: ["third-party-attestations"],
    };
  }

  if (input.state.state === "socially_supported") {
    return {
      nextAction: "review_support",
      summary: `${input.supportCount} followed or trusted third-party support attestation(s) are visible`,
      missingInputs: [],
    };
  }

  if (input.state.state === "socially_opposed") {
    return {
      nextAction: "review_opposition",
      summary: `${input.opposeCount} followed or trusted third-party opposition attestation(s) are visible`,
      missingInputs: [],
    };
  }

  return {
    nextAction: "review_split",
    summary: `${input.supportCount} support and ${input.opposeCount} opposition attestations are visible from followed or trusted observers`,
    missingInputs: [],
  };
}

export function advisePreparedMigration(
  bundle: PreparedBundle,
  preparedState = inspectPreparedBundle(bundle),
): PreparedMigrationAdvice {
  const pmas = bundle.events.filter((event) => event.kind === 1776).sort(compareEvents);
  const pmus = bundle.events.filter((event) => event.kind === 1779).sort(compareEvents);
  const latestPma = pmas.at(-1);
  const latestPmu = pmus.at(-1);

  if (preparedState.state === "conflicting_roots") {
    return {
      nextAction: "resolve_conflict",
      summary: "multiple confirmed roots remain; inspect or discard conflicting PMA evidence before continuing",
      missingInputs: [],
    };
  }

  if (preparedState.state === "conflicting_authority_updates") {
    return {
      nextAction: "resolve_conflict",
      summary:
        "multiple confirmed authority updates remain; inspect or discard conflicting PMU evidence before executing",
      missingInputs: [],
    };
  }

  if (preparedState.state === "conflicting_executions") {
    return {
      nextAction: "resolve_conflict",
      summary: "multiple confirmed executions remain; inspect or discard conflicting PMX evidence before trusting the result",
      missingInputs: [],
    };
  }

  if (!latestPma) {
    return {
      nextAction: "create_root",
      summary: "no PMA root exists yet; create a prepared migration root first",
      missingInputs: ["old-secret", "migration-secret"],
    };
  }

  const rootProofStatus = describePreparedProofStatus(bundle, latestPma.id!);
  if (preparedState.state === "none") {
    if (rootProofStatus === "none") {
      return {
        nextAction: "attach_root_proof",
        summary: "the PMA root exists but has no attached proof yet",
        missingInputs: ["root-proof-event-or-summary"],
        targetEventId: latestPma.id!,
      };
    }

    if (rootProofStatus === "pending") {
      return {
        nextAction: "wait_root_confirmation",
        summary: "the PMA root proof is still pending; wait for Bitcoin confirmation or import an updated proof summary",
        missingInputs: ["confirmed-root-proof"],
        targetEventId: latestPma.id!,
      };
    }

    if (rootProofStatus === "invalid") {
      return {
        nextAction: "repair_root_proof",
        summary: "the PMA root only has invalid proof artifacts; replace them with a valid proof event or helper summary",
        missingInputs: ["valid-root-proof"],
        targetEventId: latestPma.id!,
      };
    }
  }

  if (preparedState.state === "prepared_enrolled") {
    if (!latestPmu) {
      return {
        nextAction: "add_authority_update",
        summary: "the root is enrolled and ready for the next PMU authority update",
        missingInputs: ["old-secret", "current-migration-secret", "next-migration-secret"],
      };
    }

    if (preparedState.activeAuthority.canonicalAuthorityId !== latestPmu.id!) {
      const updateProofStatus = describePreparedProofStatus(bundle, latestPmu.id!);
      if (updateProofStatus === "none") {
        return {
          nextAction: "attach_update_proof",
          summary: "the latest PMU exists but has no attached proof yet",
          missingInputs: ["update-proof-event-or-summary"],
          targetEventId: latestPmu.id!,
        };
      }

      if (updateProofStatus === "pending") {
        return {
          nextAction: "wait_update_confirmation",
          summary:
            "the latest PMU proof is still pending; wait for Bitcoin confirmation or import an updated proof summary",
          missingInputs: ["confirmed-update-proof"],
          targetEventId: latestPmu.id!,
        };
      }

      if (updateProofStatus === "invalid") {
        return {
          nextAction: "repair_update_proof",
          summary: "the latest PMU only has invalid proof artifacts; replace them with a valid proof event or helper summary",
          missingInputs: ["valid-update-proof"],
          targetEventId: latestPmu.id!,
        };
      }
    }

    return {
      nextAction: "execute",
      summary: "the active migration authority is confirmed and ready to execute to a successor key",
      missingInputs: ["new-secret", "active-migration-secret"],
    };
  }

  if (preparedState.state === "prepared_migrated") {
    return {
      nextAction: "done",
      summary: "the transition has already executed successfully",
      missingInputs: [],
    };
  }

  return {
    nextAction: "inspect",
    summary: "inspect the bundle evidence manually; no narrower automatic next step was derived",
    missingInputs: [],
  };
}

export function summarizePreparedMigrationRelayReport(
  bundle: PreparedBundle,
): PreparedMigrationRelayReport {
  const relayObservableEventIds = bundle.events.map((event) => event.id!).filter(Boolean);
  const relayObservableProofEventIds = bundle.otsProofs.flatMap((entry) => (entry.otsEvent?.id ? [entry.otsEvent.id] : []));
  const localOnlyProofTargets = bundle.otsProofs
    .filter((entry) => !entry.otsEvent)
    .map((entry) => entry.targetEventId);
  const summaryOnlyProofTargets = bundle.otsProofs
    .filter((entry) => entry.summary && !entry.otsEvent)
    .map((entry) => entry.targetEventId);

  return {
    relayStatus: localOnlyProofTargets.length > 0 ? "partially_local_only" : "fully_relay_replayable",
    publishableEventCount: relayObservableEventIds.length,
    publishableProofCount: relayObservableProofEventIds.length,
    localOnlyProofTargets,
    summaryOnlyProofTargets,
    relayObservableEventIds,
    relayObservableProofEventIds,
  };
}

function buildMockPreparedProof(
  targetEvent: NostrEvent,
  targetKind: 1776 | 1779,
  input: { status: "pending" | "bitcoin_confirmed"; anchorHeight?: number },
): PreparedBundleProof {
  if (!targetEvent.id) {
    throw new Error("cannot create a mock proof for an event without an id");
  }

  const proofPubkey = deriveSchnorrPublicKey(MOCK_OTS_SECRET_KEY);
  const proofEvent = signNostrEventWithSecretKey(
    {
      pubkey: proofPubkey,
      created_at: targetEvent.created_at + 1,
      kind: 1040,
      tags: [
        ["e", targetEvent.id],
        ["k", String(targetKind)],
        ...(input.status === "bitcoin_confirmed" && input.anchorHeight ? [["x-verified-anchor-height", String(input.anchorHeight)]] : []),
      ],
      content: Buffer.from(`mock ots ${targetEvent.id}`, "utf8").toString("base64"),
    },
    MOCK_OTS_SECRET_KEY,
  );

  return {
    targetEventId: targetEvent.id,
    otsEvent: proofEvent,
    otsBytesBase64: proofEvent.content,
    summary: summarizeOtsProofEventForV3(proofEvent),
  };
}

function describePreparedProofStatus(
  bundle: PreparedBundle,
  targetEventId: EventId,
): "none" | "pending" | "bitcoin_confirmed" | "invalid" {
  const matches = bundle.otsProofs.filter((entry) => entry.targetEventId === targetEventId);
  if (matches.length === 0) {
    return "none";
  }

  const summaries = matches.map((entry) => {
    if (entry.summary) {
      return entry.summary;
    }

    if (entry.otsEvent) {
      return summarizeOtsProofEventForV3(entry.otsEvent);
    }

    return {
      ok: false as const,
      code: "missing_proof_artifact",
      reason: `prepared bundle proof for target ${targetEventId} is missing otsEvent and summary`,
    };
  });

  if (summaries.some((summary) => summary.ok && summary.status === "bitcoin_confirmed")) {
    return "bitcoin_confirmed";
  }

  if (summaries.some((summary) => summary.ok && summary.status === "pending")) {
    return "pending";
  }

  return "invalid";
}

async function maybePublishPreparedContinuation(input: {
  result: PreparedMigrationContinuationResult;
  publish?: boolean;
  requireFullyRelayReplayable?: boolean;
  watchSeconds?: number;
  relays?: string[];
  relayRuntime?: RelayRuntimeLike;
}): Promise<PreparedMigrationContinuationResult> {
  if (!input.publish) {
    return input.result;
  }

  input.result.publishResult = await cliPublishBundle({
    preparedBundle: input.result.finalBundle,
    relays: input.relays,
    requireFullyRelayReplayable: input.requireFullyRelayReplayable,
    relayRuntime: input.relayRuntime,
  });

  if ((input.watchSeconds ?? 0) > 0) {
    input.result.watchResult = await cliWatchBundle({
      preparedBundle: input.result.finalBundle,
      relays: input.relays,
      watchSeconds: input.watchSeconds,
      relayRuntime: input.relayRuntime,
    });
  }

  return input.result;
}

function replaceLastPreparedProofWithMockProof(
  bundle: PreparedBundle,
  targetEvent: NostrEvent,
  targetKind: 1776 | 1779,
  proof: { status: "pending" | "bitcoin_confirmed"; anchorHeight?: number },
): PreparedBundle {
  const replacement = buildMockPreparedProof(targetEvent, targetKind, proof);
  const otsProofs = [...bundle.otsProofs];
  otsProofs[otsProofs.length - 1] = replacement;
  return buildPreparedBundle({
    events: bundle.events,
    otsProofs,
    relays: bundle.relays,
  });
}

function getSinglePreparedEventByKind(
  bundle: PreparedBundle,
  kind: 1776 | 1779 | 1777,
): NostrEvent | undefined {
  const matches = bundle.events.filter((event) => event.kind === kind);
  return matches.length === 1 ? matches[0] : undefined;
}

function getLatestPreparedEventByKind(
  bundle: PreparedBundle,
  kind: 1776 | 1779 | 1777,
): NostrEvent | undefined {
  return [...bundle.events]
    .filter((event) => event.kind === kind)
    .sort(compareEvents)
    .at(-1);
}

function nextCreatedAtAfterBundle(bundle: PreparedBundle): number {
  return Math.max(...bundle.events.map((event) => event.created_at)) + 1;
}

function resolveActiveMigrationSecretKey(
  state: PreparedMigrationV3State,
  input: {
    currentMigrationSecretKey?: string;
    nextMigrationSecretKey?: string;
  },
): string | undefined {
  if (state.state !== "prepared_enrolled") {
    return undefined;
  }

  if (
    input.currentMigrationSecretKey &&
    deriveSchnorrPublicKey(input.currentMigrationSecretKey) === state.activeAuthority.migrationPubkey
  ) {
    return input.currentMigrationSecretKey;
  }

  if (
    input.nextMigrationSecretKey &&
    deriveSchnorrPublicKey(input.nextMigrationSecretKey) === state.activeAuthority.migrationPubkey
  ) {
    return input.nextMigrationSecretKey;
  }

  return undefined;
}

function createLocalSigner(secretKey: string): SignerLike {
  const pubkey = deriveSchnorrPublicKey(secretKey);

  return {
    async getPublicKey() {
      return pubkey;
    },
    async signEvent(event) {
      return signNostrEventWithSecretKey(event, secretKey);
    },
    async signDigest(digestHex) {
      return signSchnorrDigestWithSecretKey(secretKey, digestHex);
    },
  };
}

function createLocalDetachedSigner(secretKey: string) {
  const pubkey = deriveSchnorrPublicKey(secretKey);
  return {
    async getPublicKey() {
      return pubkey;
    },
    async signDigest(digestHex: string) {
      return signSchnorrDigestWithSecretKey(secretKey, digestHex);
    },
  };
}

function buildPreparedBundleProof(
  artifact: PreparedProofArtifactInput,
  defaultTargetEventId?: EventId,
): PreparedBundleProof {
  const targetEventId =
    artifact.summary && artifact.summary.ok
      ? artifact.summary.targetEventId
      : artifact.targetEventId ?? (artifact.otsEvent ? readProofTargetEventId(artifact.otsEvent) : defaultTargetEventId);

  if (!targetEventId) {
    throw new Error("prepared proof artifact is missing target event id");
  }

  return {
    targetEventId,
    otsEvent: artifact.otsEvent,
    otsBytesBase64: artifact.otsBytesBase64 ?? artifact.otsEvent?.content,
    summary: artifact.summary ?? (artifact.otsEvent ? summarizeOtsProofEventForV3(artifact.otsEvent) : undefined),
  };
}

async function inspectObservedBundleState(input: {
  preparedBundle?: PreparedBundle;
  socialBundle?: SocialBundle;
  observedEvents: NostrEvent[];
  viewerFollowSet?: Set<Hex32>;
  viewerTrustedSet?: Set<Hex32>;
}) {
  const preparedEvents = input.observedEvents.filter((event) => [1776, 1779, 1777].includes(event.kind));
  const preparedBundle =
    input.preparedBundle && preparedEvents.length > 0
      ? buildPreparedBundle({
          events: preparedEvents,
          otsProofs: input.observedEvents
            .filter((event) => event.kind === 1040)
            .map((otsEvent) => ({
              targetEventId: readProofTargetEventId(otsEvent),
              otsEvent,
              otsBytesBase64: otsEvent.content,
              summary: summarizeOtsProofEventForV3(otsEvent),
            })),
          relays: input.preparedBundle.relays,
        })
      : undefined;

  const socialEvents = input.observedEvents.filter((event) => event.kind === 1778 || event.kind === 31778);
  const socialBundle =
    input.socialBundle && socialEvents.length > 0
      ? buildSocialBundle({
          oldPubkey: input.socialBundle.oldPubkey,
          newPubkey: input.socialBundle.newPubkey,
          events: socialEvents,
          relays: input.socialBundle.relays,
        })
      : undefined;

  return cliInspectTransition({
    preparedBundle,
    socialBundle,
    viewerFollowSet: input.viewerFollowSet,
    viewerTrustedSet: input.viewerTrustedSet,
  });
}

function summarizeRelayReceipts(relays: string[], receipts: RelayReceipt[]) {
  const latestByRelay = new Map<string, RelayReceipt>();
  for (const receipt of receipts) {
    if (!latestByRelay.has(receipt.relayUrl)) {
      latestByRelay.set(receipt.relayUrl, receipt);
    }
  }

  const attemptedRelays = [...relays];
  const acceptedRelays = attemptedRelays.filter((relayUrl) => latestByRelay.get(relayUrl)?.accepted === true);
  const rejectedRelays = attemptedRelays.filter((relayUrl) => {
    const receipt = latestByRelay.get(relayUrl);
    return Boolean(receipt) && receipt?.accepted === false;
  });
  const timedOutRelays = attemptedRelays.filter((relayUrl) => !latestByRelay.has(relayUrl));

  return {
    attemptedRelays,
    acceptedRelays,
    rejectedRelays,
    timedOutRelays,
  };
}

function uniqueEventIds(eventIds: EventId[]) {
  return [...new Set(eventIds)];
}

function formatObservedStateText(result: InspectTransitionResult) {
  if (result.prepared && result.social) {
    return `${result.prepared.state}/${result.social.state}`;
  }

  return result.prepared?.state ?? result.social?.state;
}

function subscribeSessionToFilters(
  sockets: Map<string, WebSocket>,
  filters: NostrRelayFilter[],
) {
  const subscriptionId = `pubswitch-cli-${Date.now()}`;
  for (const socket of sockets.values()) {
    if (socket.readyState !== WebSocket.OPEN) {
      continue;
    }

    socket.send(JSON.stringify(["REQ", subscriptionId, ...filters]));
  }
}

function resolveRelayList(inputRelays: string[] | undefined, bundleRelays: string[] | undefined): string[] {
  const configured = inputRelays && inputRelays.length > 0 ? inputRelays : bundleRelays;
  const normalized = configured ? parseRelayUrls(configured.join("\n")) : DEFAULT_RELAYS;
  return normalized.length > 0 ? normalized : DEFAULT_RELAYS;
}

function mergeRelayHints(...relayGroups: Array<string[] | undefined>): string[] | undefined {
  const merged = parseRelayUrls(relayGroups.flatMap((group) => group ?? []).join("\n"));
  return merged.length > 0 ? merged : undefined;
}

function incrementCreatedAt(base: number | undefined, delta: number): number | undefined {
  return base === undefined ? undefined : base + delta;
}

function readProofTargetEventId(event: NostrEvent): EventId {
  const targetEventId = getSingleTagValue(event, "e");
  if (!targetEventId) {
    throw new Error("proof event is missing target e tag");
  }

  return targetEventId;
}

function describePreparedStep(kind: number): "prepare" | "update-authority" | "execute" {
  if (kind === 1776) {
    return "prepare";
  }

  if (kind === 1779) {
    return "update-authority";
  }

  return "execute";
}

function comparePreparedEvents(left: NostrEvent, right: NostrEvent): number {
  const rank = preparedEventRank(left.kind) - preparedEventRank(right.kind);
  return rank !== 0 ? rank : compareEvents(left, right);
}

function preparedEventRank(kind: number): number {
  if (kind === 1776) {
    return 0;
  }

  if (kind === 1779) {
    return 1;
  }

  return 2;
}

function compareEvents(left: NostrEvent, right: NostrEvent): number {
  if (left.created_at !== right.created_at) {
    return left.created_at - right.created_at;
  }

  const leftId = left.id ?? "";
  const rightId = right.id ?? "";
  if (leftId !== rightId) {
    return leftId.localeCompare(rightId);
  }

  return left.pubkey.localeCompare(right.pubkey);
}
