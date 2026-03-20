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
};

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
      title: "Prepared migration is visible",
      detail: "The 1776 is public, but the 1040 proof is still pending and not valid authority yet.",
    };
  }

  if (state.state === "bitcoin_confirmed") {
    return {
      tone: "ok",
      label: "Prepared",
      title: "Prepared migration is confirmed",
      detail: "The authority event is anchored and ready if this identity needs to move.",
    };
  }

  if (state.state === "executed") {
    return {
      tone: "ok",
      label: "Migrated",
      title: `Successor is ${shortHex(state.newPubkey)}`,
      detail: "Prepared migration resolved cleanly and points to one successor key.",
    };
  }

  if (state.conflictKind === "multiple_roots") {
    return {
      tone: "error",
      label: "Conflict",
      title: "Conflicting prepared roots",
      detail: "The client must stop and avoid choosing a winner.",
    };
  }

  if (state.conflictKind === "multiple_children") {
    return {
      tone: "warn",
      label: "Conflict",
      title: "Authority chain forked",
      detail: "One prepared root split into multiple active authorities.",
    };
  }

  return {
    tone: "warn",
    label: "Conflict",
    title: "Multiple successor claims exist",
    detail: "The client should show the conflict and let the user inspect, not auto-follow.",
  };
}

export function describeFollowerStage(notice: FollowerRotationNotice): OnstageSummary {
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
      };
    case "socially_opposed":
      return {
        tone: "error",
        label: "Opposed",
        title: "People you follow oppose this move",
        detail: "Keep the old key primary and show the opposition clearly.",
      };
    case "socially_split":
      return {
        tone: "warn",
        label: "Split",
        title: "People you follow disagree",
        detail: "Show both sides and let the user decide.",
      };
    case "claimed":
      return {
        tone: "warn",
        label: "Claimed",
        title: "A social transition claim exists",
        detail: "Surface it lightly until followed people weigh in.",
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
  const observedIds = new Set(input.observedEvents.map((event) => event.id));

  return input.actions
    .filter((action) => (allowedKinds ? allowedKinds.has(action.event.kind) : true))
    .map((action, index) => ({
      id: action.id,
      kind: action.event.kind,
      label: action.title.replace(/^Publish /, ""),
      status: observedIds.has(action.event.id)
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
