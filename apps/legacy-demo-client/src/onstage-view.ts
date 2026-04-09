import type { PreparedMigrationState } from "@tack/protocol-a";
import type { FollowerRotationNotice } from "./operator-view";
import type { NostrEvent } from "@tack/protocol-shared";
import type { PreparedAction } from "./demo-packages";

export type OnstageTone = "neutral" | "ok" | "warn" | "error";

export type OnstageSummary = {
  tone: OnstageTone;
  label: string;
  title: string;
  detail: string;
  clientAction?: string;
};

export function kindLabel(kind: number): string {
  switch (kind) {
    case 1:
      return "Note";
    case 1776:
      return "Migration authority";
    case 1779:
      return "Authority update";
    case 1777:
      return "Execution";
    case 1040:
      return "Timestamp proof";
    case 1778:
      return "Transition claim";
    case 31778:
      return "Attestation";
    default:
      return `kind ${kind}`;
  }
}

export type StateStep = {
  key: string;
  label: string;
  tone: OnstageTone;
  active: boolean;
};

export function getPreparedMigrationStateSteps(
  state: PreparedMigrationState | undefined,
): StateStep[] {
  const current = state?.state ?? "none";
  const isConflict = current === "conflict";
  const conflictKind = isConflict ? (state as { conflictKind?: string }).conflictKind : undefined;

  const steps: StateStep[] = [
    { key: "none", label: "No signal", tone: "neutral", active: current === "none" || current === "draft_local" },
    { key: "pending", label: "Pending proof", tone: "warn", active: current === "published_pending_ots" },
    { key: "confirmed", label: "Confirmed", tone: "ok", active: current === "bitcoin_confirmed" },
    { key: "executed", label: "Migrated", tone: "ok", active: current === "executed" },
  ];

  if (isConflict) {
    steps.forEach((s) => (s.active = false));
    const conflictLabel =
      conflictKind === "multiple_roots"
        ? "Root conflict"
        : conflictKind === "multiple_children"
          ? "Chain fork"
          : "Execution conflict";
    steps.push({ key: "conflict", label: conflictLabel, tone: "error", active: true });
  }

  return steps;
}

export function getSocialStateSteps(stateText: string): StateStep[] {
  return [
    { key: "none", label: "No claim", tone: "neutral", active: stateText === "none" },
    { key: "claimed", label: "Claimed", tone: "warn", active: stateText === "claimed" },
    { key: "supported", label: "Supported", tone: "ok", active: stateText === "socially_supported" },
    { key: "opposed", label: "Opposed", tone: "error", active: stateText === "socially_opposed" },
    { key: "split", label: "Split", tone: "warn", active: stateText === "socially_split" },
  ];
}

export type OnstageEventRow = {
  id: string;
  kind: number;
  label: string;
  status: "queued" | "sent" | "observed";
};

export function describePreparedMigrationStage(
  state: PreparedMigrationState | undefined,
): OnstageSummary {
  if (!state || state.state === "none" || state.state === "draft_local") {
    return {
      tone: "neutral",
      label: "No public signal",
      title: "No prepared migration is visible yet",
      detail: "This key still looks ordinary on relays.",
    };
  }

  if (state.state === "published_pending_ots") {
    return {
      tone: "warn",
      label: "Pending proof",
      title: "Migration authority is visible but unconfirmed",
      detail: "The authority event is public, but the timestamp proof has not anchored to Bitcoin yet.",
      clientAction: "Show info badge. Do not treat as confirmed.",
    };
  }

  if (state.state === "bitcoin_confirmed") {
    return {
      tone: "ok",
      label: "Prepared",
      title: "Prepared migration is confirmed",
      detail: "The authority event is anchored to Bitcoin and ready if this identity needs to move.",
      clientAction: "Show profile badge: prepared migration on file.",
    };
  }

  if (state.state === "executed") {
    return {
      tone: "ok",
      label: "Migrated",
      title: `This account migrated to ${shortHex(state.newPubkey)}`,
      detail: "Prepared migration resolved cleanly to one successor key.",
      clientAction: "Offer: follow new key, follow both, or inspect evidence.",
    };
  }

  if (state.conflictKind === "multiple_roots") {
    return {
      tone: "error",
      label: "Conflict",
      title: "Conflicting prepared roots",
      detail: "Multiple migration authorities exist at the same earliest block height.",
      clientAction: "Auto-follow disabled. Show all evidence. User must inspect.",
    };
  }

  if (state.conflictKind === "multiple_children") {
    return {
      tone: "warn",
      label: "Conflict",
      title: "Authority chain forked",
      detail: "One prepared root split into multiple active authorities.",
      clientAction: "Auto-follow disabled. Show all evidence. User must inspect.",
    };
  }

  return {
    tone: "warn",
    label: "Conflict",
    title: "Multiple successor claims exist",
    detail: "Two or more execution events point to different successor keys.",
    clientAction: "Auto-follow disabled. Show all evidence. User must inspect.",
  };
}

export function describeFollowerStage(notice: FollowerRotationNotice): OnstageSummary {
  const clientAction =
    notice.tone === "ok"
      ? "Show migration banner. Offer: follow new key, follow both, inspect."
      : notice.tone === "error"
        ? "Show conflict warning. Do not auto-follow."
        : notice.tone === "warn"
          ? "Show caution banner. Suggest inspecting evidence."
          : undefined;

  return {
    tone: notice.tone,
    label:
      notice.tone === "ok"
        ? "Follower banner"
        : notice.tone === "warn"
          ? "Warning"
          : notice.tone === "error"
            ? "Stop state"
            : "Quiet",
    title: notice.title,
    detail: notice.detail,
    clientAction,
  };
}

export function describeSocialStage(stateText: string): OnstageSummary {
  switch (stateText) {
    case "socially_supported":
      return {
        tone: "ok",
        label: "Supported",
        title: "People you follow support this move",
        detail: "This is strong social evidence, but it remains separate from Prepared Migration.",
        clientAction: "Show social support badge. Do not auto-migrate.",
      };
    case "socially_opposed":
      return {
        tone: "error",
        label: "Opposed",
        title: "People you follow oppose this move",
        detail: "Keep the old key primary and show the opposition clearly.",
        clientAction: "Show opposition warning. Keep old key primary.",
      };
    case "socially_split":
      return {
        tone: "warn",
        label: "Split",
        title: "People you follow disagree",
        detail: "Show both sides and let the user decide.",
        clientAction: "Show both sides. Let user decide.",
      };
    case "claimed":
      return {
        tone: "warn",
        label: "Claimed",
        title: "A social transition claim exists",
        detail: "Surface it lightly until followed people weigh in.",
        clientAction: "Show claim quietly. Wait for attestations.",
      };
    default:
      return {
        tone: "neutral",
        label: "No claim",
        title: "No social transition signal yet",
        detail: "Stay quiet unless the user explicitly opens the profile.",
      };
  }
}

export function buildOnstageEventRows(input: {
  actions: PreparedAction[];
  observedEvents: NostrEvent[];
  publishCursor: number;
  kinds?: number[];
}): OnstageEventRow[] {
  const allowedKinds = input.kinds ? new Set(input.kinds) : undefined;
  const preparedIds = new Set(input.actions.map((action) => action.event.id));
  const observedPreparedIds = new Set(
    input.observedEvents.filter((event) => preparedIds.has(event.id)).map((event) => event.id),
  );

  return input.actions
    .filter((action) => (allowedKinds ? allowedKinds.has(action.event.kind) : true))
    .map((action, index) => ({
      id: action.id,
      kind: action.event.kind,
      label: action.title.replace(/^Publish /, ""),
      status: observedPreparedIds.has(action.event.id)
        ? "observed"
        : index < input.publishCursor
          ? "sent"
          : "queued",
    }));
}

function shortHex(value: string | undefined): string {
  if (!value) {
    return "(none)";
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}
