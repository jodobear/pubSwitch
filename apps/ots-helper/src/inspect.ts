import { OTS_KIND, VERIFIED_ANCHOR_HEIGHT_TAG } from "../../../packages/protocol-a/src/index";
import { type EventId, type NostrEvent } from "../../../packages/protocol-shared/src/index";
import {
  getPathAFixtureScenario,
  type PathAFixtureScenario,
} from "../../../packages/fixtures/src/index";

const HEX_64_PATTERN = /^[0-9a-f]{64}$/;

export type InvalidOtsProof = {
  ok: false;
  code: string;
  reason: string;
  proofEventId?: EventId;
};

export type InspectedOtsProof = {
  ok: true;
  proofEventId: EventId;
  targetEventId: EventId;
  targetKind: number;
  contentLength: number;
  status: "pending" | "bitcoin_confirmed";
  anchorHeight?: number;
};

export type ScenarioProofInspection = {
  scenarioId: string;
  title: string;
  inspections: Array<InspectedOtsProof | InvalidOtsProof>;
};

export function inspectOtsProofEvent(event: NostrEvent): InspectedOtsProof | InvalidOtsProof {
  const proofEventId = isEventId(event.id) ? event.id : undefined;

  if (event.kind !== OTS_KIND) {
    return invalid("wrong_kind", `OTS proof kind must be ${OTS_KIND}`, proofEventId);
  }

  if (!isEventId(event.id)) {
    return invalid("invalid_id", "OTS proof event id must be 32-byte lowercase hex", proofEventId);
  }

  if (typeof event.content !== "string" || event.content.length === 0) {
    return invalid("empty_content", "OTS proof event content must contain proof bytes", event.id);
  }

  const targetEventId = getSingleTagValue(event, "e");
  if (!isEventId(targetEventId)) {
    return invalid("invalid_target_event", "OTS proof must contain exactly one lowercase-hex e tag", event.id);
  }

  const targetKindText = getSingleTagValue(event, "k");
  const targetKind = parsePositiveInteger(targetKindText);
  if (targetKind === undefined) {
    return invalid("invalid_target_kind", "OTS proof must contain exactly one positive-integer k tag", event.id);
  }

  const anchorHeight = parsePositiveInteger(getSingleTagValue(event, VERIFIED_ANCHOR_HEIGHT_TAG));

  return {
    ok: true,
    proofEventId: event.id,
    targetEventId,
    targetKind,
    contentLength: event.content.length,
    status: anchorHeight === undefined ? "pending" : "bitcoin_confirmed",
    anchorHeight,
  };
}

export function inspectOtsProofs(events: NostrEvent[]): Array<InspectedOtsProof | InvalidOtsProof> {
  return events.map((event) => inspectOtsProofEvent(event));
}

export async function inspectPathAScenarioProofs(
  scenarioId: string,
): Promise<ScenarioProofInspection | InvalidOtsProof> {
  const scenario = await getPathAFixtureScenario(scenarioId);

  if (!scenario) {
    return invalid("unknown_scenario", `Unknown Path A scenario: ${scenarioId}`);
  }

  return inspectScenarioProofs(scenario);
}

export function inspectScenarioProofs(scenario: PathAFixtureScenario): ScenarioProofInspection {
  return {
    scenarioId: scenario.id,
    title: scenario.title,
    inspections: inspectOtsProofs(scenario.otsProofs),
  };
}

function getSingleTagValue(event: NostrEvent, name: string): string | undefined {
  const matches = event.tags.filter((tag) => tag[0] === name).map((tag) => tag[1] ?? "");

  if (matches.length !== 1) {
    return undefined;
  }

  return matches[0];
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^[1-9][0-9]*$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isEventId(value: string | undefined): value is EventId {
  return typeof value === "string" && HEX_64_PATTERN.test(value);
}

function invalid(code: string, reason: string, proofEventId?: EventId): InvalidOtsProof {
  return {
    ok: false,
    code,
    reason,
    proofEventId,
  };
}
