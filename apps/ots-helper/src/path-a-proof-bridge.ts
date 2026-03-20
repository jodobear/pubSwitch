import { type PreparedMigrationState } from "../../../packages/protocol-a/src/index";
import { type EventId } from "../../../packages/protocol-shared/src/index";
import { type PathAFixtureScenario } from "../../../packages/fixtures/src/index";
import { inspectScenarioProofs } from "./inspect";

export type PathAProofBridgeSummary =
  | {
      ok: true;
      helperStatus: "no_proofs" | "pending_only" | "confirmed_authority" | "conflict_plural_authority";
      pendingProofEventIds: EventId[];
      confirmedProofEventIds: EventId[];
      confirmedTargetEventIds: EventId[];
      authorityId?: EventId;
      reason?: string;
    }
  | {
      ok: false;
      helperStatus: "invalid_helper_output" | "missing_pending_proof" | "missing_confirmed_authority_proof";
      pendingProofEventIds: EventId[];
      confirmedProofEventIds: EventId[];
      confirmedTargetEventIds: EventId[];
      authorityId?: EventId;
      reason: string;
      invalidProofEventIds: EventId[];
    };

export function summarizePathAProofBridge(input: {
  scenario: PathAFixtureScenario;
  resolvedState: PreparedMigrationState;
}): PathAProofBridgeSummary {
  const inspection = inspectScenarioProofs(input.scenario);
  const invalidProofEventIds = inspection.inspections
    .filter((entry): entry is Extract<(typeof inspection.inspections)[number], { ok: false }> => !entry.ok)
    .flatMap((entry) => (entry.proofEventId ? [entry.proofEventId] : []));

  const pendingProofEventIds = inspection.inspections
    .filter((entry): entry is Extract<(typeof inspection.inspections)[number], { ok: true }> => entry.ok)
    .filter((entry) => entry.status === "pending")
    .map((entry) => entry.proofEventId);

  const confirmedInspections = inspection.inspections
    .filter((entry): entry is Extract<(typeof inspection.inspections)[number], { ok: true }> => entry.ok)
    .filter((entry) => entry.status === "bitcoin_confirmed");

  const confirmedProofEventIds = confirmedInspections.map((entry) => entry.proofEventId);
  const confirmedTargetEventIds = [...new Set(confirmedInspections.map((entry) => entry.targetEventId))];

  if (invalidProofEventIds.length > 0) {
    return {
      ok: false,
      helperStatus: "invalid_helper_output",
      pendingProofEventIds,
      confirmedProofEventIds,
      confirmedTargetEventIds,
      invalidProofEventIds,
      reason: `helper inspection found invalid OTS proof events: ${invalidProofEventIds.join(", ")}`,
    };
  }

  if (input.resolvedState.state === "none" || input.resolvedState.state === "draft_local") {
    return {
      ok: true,
      helperStatus: confirmedProofEventIds.length > 0 ? "confirmed_authority" : pendingProofEventIds.length > 0 ? "pending_only" : "no_proofs",
      pendingProofEventIds,
      confirmedProofEventIds,
      confirmedTargetEventIds,
    };
  }

  if (input.resolvedState.state === "published_pending_ots") {
    if (pendingProofEventIds.length === 0 || confirmedProofEventIds.length > 0) {
      return {
        ok: false,
        helperStatus: "missing_pending_proof",
        pendingProofEventIds,
        confirmedProofEventIds,
        confirmedTargetEventIds,
        invalidProofEventIds,
        reason: "resolved pending OTS state must have helper-visible pending proofs and no confirmed proofs",
      };
    }

    return {
      ok: true,
      helperStatus: "pending_only",
      pendingProofEventIds,
      confirmedProofEventIds,
      confirmedTargetEventIds,
    };
  }

  if (
    input.resolvedState.state === "conflict" &&
    (input.resolvedState.conflictKind === "multiple_roots" ||
      input.resolvedState.conflictKind === "multiple_children")
  ) {
    return {
      ok: true,
      helperStatus: "conflict_plural_authority",
      pendingProofEventIds,
      confirmedProofEventIds,
      confirmedTargetEventIds,
      reason:
        input.resolvedState.conflictKind === "multiple_roots"
          ? "helper cannot choose one authority because multiple confirmed roots remain"
          : "helper cannot choose one authority because multiple confirmed child authorities remain",
    };
  }

  const authorityId = extractAuthorityId(input.resolvedState);

  if (!authorityId || !confirmedTargetEventIds.includes(authorityId)) {
    return {
      ok: false,
      helperStatus: "missing_confirmed_authority_proof",
      pendingProofEventIds,
      confirmedProofEventIds,
      confirmedTargetEventIds,
      authorityId,
      invalidProofEventIds,
      reason: authorityId
        ? `helper inspection did not confirm the resolved authority event ${authorityId}`
        : "resolved Path A state did not expose a helper-checkable authority id",
    };
  }

  return {
    ok: true,
    helperStatus: "confirmed_authority",
    pendingProofEventIds,
    confirmedProofEventIds,
    confirmedTargetEventIds,
    authorityId,
  };
}

function extractAuthorityId(state: PreparedMigrationState): EventId | undefined {
  if (state.state === "bitcoin_confirmed" || state.state === "executed") {
    return state.authorityId;
  }

  if (
    state.state !== "conflict" ||
    state.conflictKind === "multiple_roots" ||
    state.conflictKind === "multiple_children"
  ) {
    return undefined;
  }

  return state.authorityId;
}
