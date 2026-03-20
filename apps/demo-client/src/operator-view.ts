import { getSingleTagValue, type NostrEvent } from "@tack/protocol-shared";
import type { PublishReceipt } from "./public-relay";
import type { LiveDemoPackage } from "./demo-packages";
import type { PreparedMigrationState } from "@tack/protocol-a";

export type FollowerRotationNotice = {
  tone: "neutral" | "ok" | "warn" | "error";
  title: string;
  detail: string;
  showAttestAction: boolean;
  recommendedAction?: "inspect" | "accept" | "reject" | "ignore";
};

export function shortHex(value: string | undefined): string {
  if (!value) {
    return "(none)";
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function describeIdentityState(input: {
  demoPackage: LiveDemoPackage;
  pathAState?: PreparedMigrationState;
  pathCStateText: string;
}): string {
  if (input.demoPackage.lane === "path-c") {
    return input.pathCStateText;
  }

  const state = input.pathAState;
  if (!state) {
    return "(not selected)";
  }

  if (state.state === "bitcoin_confirmed") {
    return `bitcoin_confirmed ${shortHex(state.authorityId)}`;
  }

  if (state.state === "executed") {
    return `executed ${shortHex(state.newPubkey)}`;
  }

  if (state.state === "conflict") {
    return `${state.conflictKind} conflict`;
  }

  return state.state;
}

export function describeObservedEvent(event: NostrEvent): string {
  switch (event.kind) {
    case 1:
      return event.content;
    case 1776:
      return `PMA old=${shortHex(getSingleTagValue(event, "o"))} migration=${shortHex(getSingleTagValue(event, "m"))}`;
    case 1779:
      return `PMU authority=${shortHex(getSingleTagValue(event, "e"))} next=${shortHex(getSingleTagValue(event, "u"))}`;
    case 1777:
      return `PMX execution for authority ${shortHex(getSingleTagValue(event, "e"))}`;
    case 1040:
      return `OTS proof for ${shortHex(getSingleTagValue(event, "e"))}`;
    case 1778:
      return `STC role=${getSingleTagValue(event, "r")}`;
    case 31778:
      return `STA stance=${getSingleTagValue(event, "s") ?? "uncertain"}`;
    default:
      return `kind ${event.kind}`;
  }
}

export function summarizeReceipt(receipt: PublishReceipt | undefined): string {
  if (!receipt) {
    return "idle";
  }

  if (receipt.accepted) {
    return "accepted";
  }

  const text = `${receipt.message ?? ""}`.toLowerCase();
  if (text.includes("duplicate")) {
    return "duplicate";
  }

  return "rejected";
}

export function receiptTone(receipt: PublishReceipt | undefined): "ok" | "muted" | "warn" {
  if (!receipt) {
    return "muted";
  }

  return receipt.accepted ? "ok" : summarizeReceipt(receipt) === "duplicate" ? "muted" : "warn";
}

export function buildScenarioPrompt(demoPackage: LiveDemoPackage): string {
  if (demoPackage.lane === "path-a") {
    switch (demoPackage.id) {
      case "pending-ots":
        return "Start with a normal note, then publish the PMA and pending proof to show that pending OTS is visible but not yet authority.";
      case "real-confirmed-pma":
        return "Publish a normal note first, then the real confirmed PMA and proof to show the simplest cryptographic continuity anchor.";
      case "confirmed-authority":
        return "Publish a note, then walk the duplicate-confirmed root and child set to show one surviving authority.";
      case "conflicting-roots":
        return "Publish both confirmed roots to show that Path A refuses to choose one starting authority.";
      case "conflicting-children":
        return "Publish one confirmed root, then two conflicting confirmed children to show a fork under one root.";
      case "executed-happy-path":
        return "Publish a note from the old key, walk the chain, then show execution to one successor.";
      case "conflicting-executions":
        return "Publish the chain, then two competing executions to show plural successors.";
      default:
        return demoPackage.summary;
    }
  }

  switch (demoPackage.id) {
    case "claim-only":
      return "Publish the first-party claim and show that Path C stands on its own as advisory evidence.";
    case "socially-supported":
      return "Publish the claim, then followed third-party support to show independent social backing.";
    case "socially-split":
      return "Publish the claim, then support and opposition to show split advisory evidence.";
    default:
      return demoPackage.summary;
  }
}

export function buildFollowerRotationNotice(input: {
  pathAState?: PreparedMigrationState;
  observedProtocolKinds: number[];
}): FollowerRotationNotice {
  const hasPmx = input.observedProtocolKinds.includes(1777);
  const hasPma = input.observedProtocolKinds.includes(1776);

  if (!input.pathAState || input.observedProtocolKinds.length === 0) {
    return {
      tone: "neutral",
      title: "No rotation notice yet",
      detail: "This follow has not published any visible Path A events yet, so the client should stay quiet.",
      showAttestAction: false,
    };
  }

  switch (input.pathAState.state) {
    case "draft_local":
    case "none":
      return {
        tone: "neutral",
        title: "No user-facing rotation state yet",
        detail: "Nothing relay-visible is strong enough to surface to followers yet.",
        showAttestAction: false,
      };
    case "published_pending_ots":
      return {
        tone: "warn",
        title: "A follow started rotating keys",
        detail:
          "The client can show a banner and let you inspect evidence, but pending 1040 proof is not valid continuity yet.",
        showAttestAction: false,
        recommendedAction: hasPma ? "inspect" : "ignore",
      };
    case "bitcoin_confirmed":
      return {
        tone: "ok",
        title: "Confirmed rotation authority is visible",
        detail:
          "The migration evidence is now confirmed. Followers should be able to inspect it, but there is no executed successor yet.",
        showAttestAction: false,
        recommendedAction: "inspect",
      };
    case "executed":
      return {
        tone: "ok",
        title: "A follow rotated to a successor key",
        detail:
          "The client should show a clear banner, the successor key, and a path into social attestation or local follow updates.",
        showAttestAction: hasPmx,
        recommendedAction: "accept",
      };
    case "conflict":
      return {
        tone: input.pathAState.conflictKind === "multiple_roots" ? "error" : "warn",
        title: "This rotation is unresolved",
        detail:
          input.pathAState.conflictKind === "multiple_roots"
            ? "Followers should see a stop-state warning because there is no single cryptographic root to trust."
            : input.pathAState.conflictKind === "multiple_children"
              ? "Followers should see a warning because one root split into multiple active children."
              : "Followers should see a warning because one authority executed to multiple successor outcomes.",
        showAttestAction: false,
        recommendedAction: "reject",
      };
  }
}

export function getSuggestedPathCPackageIdForPathA(pathAPackageId: string): string {
  switch (pathAPackageId) {
    case "conflicting-roots":
    case "conflicting-children":
    case "conflicting-executions":
      return "socially-split";
    case "pending-ots":
      return "claim-only";
    default:
      return "socially-supported";
  }
}

export function buildSignupState(input: {
  handle: string;
  passphrase: string;
  confirmPassphrase: string;
  bundleReady: boolean;
  connected: boolean;
  pmaSent: boolean;
  proofSent: boolean;
}): {
  handleReady: boolean;
  passphraseReady: boolean;
  passphraseMatches: boolean;
  canCreatePackage: boolean;
  canFinishSignup: boolean;
  stageLabel: string;
} {
  const handleReady = input.handle.trim().length > 0;
  const passphraseReady = input.passphrase.trim().length > 0;
  const passphraseMatches = passphraseReady && input.passphrase === input.confirmPassphrase;
  const canCreatePackage = handleReady && passphraseMatches;
  const canFinishSignup = canCreatePackage && input.connected;

  if (input.proofSent) {
    return {
      handleReady,
      passphraseReady,
      passphraseMatches,
      canCreatePackage,
      canFinishSignup,
      stageLabel: "complete",
    };
  }

  if (input.pmaSent) {
    return {
      handleReady,
      passphraseReady,
      passphraseMatches,
      canCreatePackage,
      canFinishSignup,
      stageLabel: "publishing proof",
    };
  }

  if (input.bundleReady) {
    return {
      handleReady,
      passphraseReady,
      passphraseMatches,
      canCreatePackage,
      canFinishSignup,
      stageLabel: input.connected ? "ready to publish" : "connect relays",
    };
  }

  return {
    handleReady,
    passphraseReady,
    passphraseMatches,
    canCreatePackage,
    canFinishSignup,
    stageLabel: passphraseMatches ? "ready" : passphraseReady ? "confirm passphrase" : "empty",
  };
}
