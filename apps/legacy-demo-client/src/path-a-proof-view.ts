import { type PathAFixtureScenario } from "../../../packages/fixtures/src/index";
import { type PreparedMigrationState } from "../../../packages/protocol-a/src/index";
import { inspectScenarioProofs } from "../../ots-helper/src/inspect";
import { summarizePathAProofBridge } from "../../ots-helper/src/path-a-proof-bridge";

type Tone = "ok" | "warn" | "error" | "neutral";

export type PathAProofSummaryView = {
  statusCode:
    | "no_proofs"
    | "pending_only"
    | "confirmed_authority"
    | "conflict_plural_authority"
    | "invalid_helper_output"
    | "missing_pending_proof"
    | "missing_confirmed_authority_proof";
  tone: Tone;
  title: string;
  detail: string;
  authorityId?: string;
  pendingProofEventIds: string[];
  confirmedProofEventIds: string[];
  confirmedTargetEventIds: string[];
  invalidProofEventIds: string[];
};

export type PathAProofInspectionView =
  | {
      kind: "valid";
      tone: Tone;
      statusCode: "pending" | "bitcoin_confirmed";
      proofEventId: string;
      targetEventId: string;
      targetKind: number;
      contentLength: number;
      anchorHeight?: number;
    }
  | {
      kind: "invalid";
      tone: "error";
      statusCode: "invalid";
      proofEventId?: string;
      code: string;
      reason: string;
    };

export type PathAProofProvenanceCard = {
  source: "protocol" | "helper" | "app";
  title: string;
  items: string[];
};

export type PathAProofViewModel = {
  summary: PathAProofSummaryView;
  inspections: PathAProofInspectionView[];
  provenance: PathAProofProvenanceCard[];
};

export function buildPathAProofViewModel(input: {
  scenario: PathAFixtureScenario;
  resolvedState: PreparedMigrationState;
}): PathAProofViewModel {
  const inspection = inspectScenarioProofs(input.scenario);
  const helperSummary = summarizePathAProofBridge(input);

  const inspections: PathAProofInspectionView[] = inspection.inspections.map((entry) => {
    if (!entry.ok) {
      return {
        kind: "invalid",
        tone: "error",
        statusCode: "invalid",
        proofEventId: entry.proofEventId,
        code: entry.code,
        reason: entry.reason,
      };
    }

    return {
      kind: "valid",
      tone: entry.status === "bitcoin_confirmed" ? "ok" : "warn",
      statusCode: entry.status,
      proofEventId: entry.proofEventId,
      targetEventId: entry.targetEventId,
      targetKind: entry.targetKind,
      contentLength: entry.contentLength,
      anchorHeight: entry.anchorHeight,
    };
  });

  const summary = buildSummaryView(helperSummary);
  const provenance = buildProvenanceCards({
    scenario: input.scenario,
    resolvedState: input.resolvedState,
    summary,
  });

  return {
    summary,
    inspections,
    provenance,
  };
}

function buildSummaryView(
  summary: ReturnType<typeof summarizePathAProofBridge>,
): PathAProofSummaryView {
  if (!summary.ok) {
    if (summary.helperStatus === "invalid_helper_output") {
      return {
        statusCode: summary.helperStatus,
        tone: "error",
        title: "Invalid helper output",
        detail: summary.reason,
        authorityId: summary.authorityId,
        pendingProofEventIds: summary.pendingProofEventIds,
        confirmedProofEventIds: summary.confirmedProofEventIds,
        confirmedTargetEventIds: summary.confirmedTargetEventIds,
        invalidProofEventIds: summary.invalidProofEventIds,
      };
    }

    if (summary.helperStatus === "missing_pending_proof") {
      return {
        statusCode: summary.helperStatus,
        tone: "warn",
        title: "Pending proof posture mismatch",
        detail: summary.reason,
        authorityId: summary.authorityId,
        pendingProofEventIds: summary.pendingProofEventIds,
        confirmedProofEventIds: summary.confirmedProofEventIds,
        confirmedTargetEventIds: summary.confirmedTargetEventIds,
        invalidProofEventIds: summary.invalidProofEventIds,
      };
    }

    return {
      statusCode: summary.helperStatus,
      tone: "warn",
      title: "Confirmed authority coverage missing",
      detail: summary.reason,
      authorityId: summary.authorityId,
      pendingProofEventIds: summary.pendingProofEventIds,
      confirmedProofEventIds: summary.confirmedProofEventIds,
      confirmedTargetEventIds: summary.confirmedTargetEventIds,
      invalidProofEventIds: summary.invalidProofEventIds,
    };
  }

  if (summary.helperStatus === "no_proofs") {
    return {
      statusCode: summary.helperStatus,
      tone: "neutral",
      title: "No helper-visible proofs",
      detail: "The helper did not find any `1040` proofs for this scenario.",
      authorityId: summary.authorityId,
      pendingProofEventIds: summary.pendingProofEventIds,
      confirmedProofEventIds: summary.confirmedProofEventIds,
      confirmedTargetEventIds: summary.confirmedTargetEventIds,
      invalidProofEventIds: [],
    };
  }

  if (summary.helperStatus === "pending_only") {
    return {
      statusCode: summary.helperStatus,
      tone: "warn",
      title: "Pending helper-visible proof set",
      detail: "The helper sees pending `1040` proofs, but none of them count as confirmed Path A authority yet.",
      authorityId: summary.authorityId,
      pendingProofEventIds: summary.pendingProofEventIds,
      confirmedProofEventIds: summary.confirmedProofEventIds,
      confirmedTargetEventIds: summary.confirmedTargetEventIds,
      invalidProofEventIds: [],
    };
  }

  if (summary.helperStatus === "conflict_plural_authority") {
    return {
      statusCode: summary.helperStatus,
      tone: "warn",
      title: "Plural authority conflict",
      detail:
        summary.reason ??
        "The helper found confirmed proofs, but it cannot claim one active authority while Path A remains in a plural conflict state.",
      authorityId: summary.authorityId,
      pendingProofEventIds: summary.pendingProofEventIds,
      confirmedProofEventIds: summary.confirmedProofEventIds,
      confirmedTargetEventIds: summary.confirmedTargetEventIds,
      invalidProofEventIds: [],
    };
  }

  return {
    statusCode: summary.helperStatus,
    tone: "ok",
    title: "Confirmed authority coverage",
    detail: "The helper sees confirmed proof coverage for the resolved Path A authority event.",
    authorityId: summary.authorityId,
    pendingProofEventIds: summary.pendingProofEventIds,
    confirmedProofEventIds: summary.confirmedProofEventIds,
    confirmedTargetEventIds: summary.confirmedTargetEventIds,
    invalidProofEventIds: [],
  };
}

function buildProvenanceCards(input: {
  scenario: PathAFixtureScenario;
  resolvedState: PreparedMigrationState;
  summary: PathAProofSummaryView;
}): PathAProofProvenanceCard[] {
  const authorityId = input.summary.authorityId ?? getStructuredAuthorityId(input.resolvedState);
  const conflictDetail =
    input.resolvedState.state !== "conflict"
      ? undefined
      : input.resolvedState.conflictKind === "multiple_roots"
        ? `conflict_root_count ${input.resolvedState.authorityIds.length}`
        : input.resolvedState.conflictKind === "multiple_children"
          ? `conflicting_child_count ${input.resolvedState.conflictingAuthorityIds.length}`
          : `conflicting_execution_count ${input.resolvedState.conflictingExecutionIds.length}`;

  return [
    {
      source: "protocol",
      title: "Protocol-derived facts",
      items: [
        `resolved_state ${input.resolvedState.state}`,
        ...(input.resolvedState.state === "conflict" ? [`conflict_kind ${input.resolvedState.conflictKind}`] : []),
        authorityId ? `authority_id ${authorityId}` : "authority_id unavailable in this resolved state",
        ...(conflictDetail ? [conflictDetail] : []),
        "resolver output comes from packages/protocol-a",
      ],
    },
    {
      source: "helper",
      title: "Helper-derived facts",
      items: [
        `helper_status ${input.summary.statusCode}`,
        `confirmed_target_count ${input.summary.confirmedTargetEventIds.length}`,
        `invalid_proof_count ${input.summary.invalidProofEventIds.length}`,
        ...(input.summary.statusCode === "conflict_plural_authority"
          ? ["helper_authority_coverage unavailable while the protocol state is plural"]
          : []),
        "helper status still depends on local x-verified-anchor-height metadata instead of raw .ots verification",
      ],
    },
    {
      source: "app",
      title: "App-derived facts",
      items: [
        `fixture_scenario ${input.scenario.id}`,
        `proof_backing ${input.scenario.proofBacking}`,
        ...getRealCorpusFacts(input.scenario),
        "cards, badges, and counts in this workspace are presentation-only",
        "raw protocol and raw proof event JSON remain separate below",
      ],
    },
  ];
}

function getStructuredAuthorityId(state: PreparedMigrationState): string | undefined {
  if ("authorityId" in state) {
    return state.authorityId;
  }

  return undefined;
}

function getRealCorpusFacts(scenario: PathAFixtureScenario): string[] {
  const corpusIds = scenario.realOtsCorpusIds ?? (scenario.realOtsCorpusId ? [scenario.realOtsCorpusId] : []);
  return corpusIds.map((corpusId) => `shared_real_corpus ${corpusId}`);
}
