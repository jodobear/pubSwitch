import OpenTimestampsCjs from "opentimestamps";
import { type OtsProofSummary } from "../../../packages/protocol-a/src/index";
import { type EventId, type NostrEvent } from "../../../packages/protocol-shared/src/index";
import { type PathAFixtureScenario, getPathAFixtureScenario } from "../../../packages/fixtures/src/index";
import {
  type InvalidOtsProof,
  type InspectedOtsProof,
  type ScenarioProofInspection,
  inspectOtsProofEvent,
} from "./inspect";

const HEX_PATTERN = /^[0-9a-f]+$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const OTS_HEADER_HEX = "004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294";
const OTS_HEADER_BYTES = hexToBytes(OTS_HEADER_HEX);
const OpenTimestamps = OpenTimestampsCjs as OpenTimestampsRuntime;

type OpenTimestampsRuntime = {
  DetachedTimestampFile: {
    deserialize(input: Uint8Array | ArrayBuffer): OtsDetachedTimestampFile;
  };
  Notary: {
    BitcoinBlockHeaderAttestation: new (height: number) => {
      height: number;
    };
    PendingAttestation: new (...args: never[]) => object;
  };
};

type OtsDetachedTimestampFile = {
  fileHashOp: {
    _HASHLIB_NAME(): string;
  };
  fileDigest(): number[];
  timestamp: {
    isTimestampComplete(): boolean;
    allAttestations(): Map<unknown, unknown>;
  };
};

type RealOtsVerification =
  | {
      kind: "verified";
      status: "pending" | "bitcoin_confirmed";
      anchorHeight?: number;
    }
  | {
      kind: "invalid";
      code: string;
      reason: string;
    }
  | {
      kind: "no_real_proof";
    };

export function inspectOtsProofEventWithRealVerification(
  event: NostrEvent,
): InspectedOtsProof | InvalidOtsProof {
  const legacyInspection = inspectOtsProofEvent(event);

  if (!legacyInspection.ok) {
    return legacyInspection;
  }

  const realProof = inspectRealOtsPayload(event.content, legacyInspection.targetEventId);

  if (realProof.kind === "invalid") {
    return {
      ok: false,
      code: realProof.code,
      reason: realProof.reason,
      proofEventId: legacyInspection.proofEventId,
    };
  }

  if (realProof.kind === "verified") {
    return {
      ...legacyInspection,
      status: realProof.status,
      anchorHeight: realProof.anchorHeight,
    };
  }

  return legacyInspection;
}

export function inspectOtsProofsWithRealVerification(
  events: NostrEvent[],
): Array<InspectedOtsProof | InvalidOtsProof> {
  return events.map((event) => inspectOtsProofEventWithRealVerification(event));
}

export function summarizeOtsProofEventForV3(event: NostrEvent): OtsProofSummary {
  const inspection = inspectOtsProofEventWithRealVerification(event);

  if (!inspection.ok) {
    return {
      ok: false,
      proofEventId: inspection.proofEventId,
      code: inspection.code,
      reason: inspection.reason,
    };
  }

  if (inspection.status === "bitcoin_confirmed") {
    return {
      ok: true,
      proofEventId: inspection.proofEventId,
      targetEventId: inspection.targetEventId,
      targetKind: inspection.targetKind,
      status: "bitcoin_confirmed",
      anchorHeight: inspection.anchorHeight!,
    };
  }

  return {
    ok: true,
    proofEventId: inspection.proofEventId,
    targetEventId: inspection.targetEventId,
    targetKind: inspection.targetKind,
    status: "pending",
  };
}

export function summarizeOtsProofEventsForV3(events: NostrEvent[]): OtsProofSummary[] {
  return events.map((event) => summarizeOtsProofEventForV3(event));
}

export function inspectScenarioProofsWithRealVerification(
  scenario: PathAFixtureScenario,
): ScenarioProofInspection {
  return {
    scenarioId: scenario.id,
    title: scenario.title,
    inspections: inspectOtsProofsWithRealVerification(scenario.otsProofs),
  };
}

export async function inspectPathAScenarioProofsWithRealVerification(
  scenarioId: string,
): Promise<ScenarioProofInspection | InvalidOtsProof> {
  const scenario = await getPathAFixtureScenario(scenarioId);

  if (!scenario) {
    return {
      ok: false,
      code: "unknown_scenario",
      reason: `Unknown Path A scenario: ${scenarioId}`,
    };
  }

  return inspectScenarioProofsWithRealVerification(scenario);
}

function inspectRealOtsPayload(content: string, targetEventId: EventId): RealOtsVerification {
  const decoded = decodeRealOtsContent(content);

  if (!decoded) {
    return {
      kind: "no_real_proof",
    };
  }

  let detached: OtsDetachedTimestampFile;
  try {
    detached = OpenTimestamps.DetachedTimestampFile.deserialize(decoded);
  } catch (error) {
    return {
      kind: "invalid",
      code: "invalid_ots",
      reason: `OTS proof bytes could not be deserialized: ${getErrorMessage(error)}`,
    };
  }

  if (detached.fileHashOp._HASHLIB_NAME() !== "sha256") {
    return {
      kind: "invalid",
      code: "unsupported_hash_op",
      reason: "OTS proof must use sha256 file-hash semantics for NIP-03 event-id binding",
    };
  }

  const digestHex = bytesToHex(detached.fileDigest());
  if (digestHex !== targetEventId) {
    return {
      kind: "invalid",
      code: "digest_mismatch",
      reason: `OTS proof digest ${digestHex} does not match target event id ${targetEventId}`,
    };
  }

  const bitcoinHeights = getBitcoinAttestationHeights(detached);
  if (bitcoinHeights.length > 0) {
    return {
      kind: "verified",
      status: "bitcoin_confirmed",
      anchorHeight: Math.min(...bitcoinHeights),
    };
  }

  if (hasPendingAttestation(detached)) {
    return {
      kind: "verified",
      status: "pending",
    };
  }

  return {
    kind: "invalid",
    code: detached.timestamp.isTimestampComplete()
      ? "missing_bitcoin_attestation"
      : "missing_attestation",
    reason: detached.timestamp.isTimestampComplete()
      ? "OTS proof parsed locally but does not contain a Bitcoin block-header attestation"
      : "OTS proof parsed locally but does not contain any recognized pending or Bitcoin attestation",
  };
}

function decodeRealOtsContent(content: string): Uint8Array | undefined {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.length % 2 === 0 && HEX_PATTERN.test(trimmed)) {
    const bytes = hexToBytes(trimmed);
    if (hasOtsHeader(bytes)) {
      return bytes;
    }
  }

  if (isBase64(trimmed)) {
    const bytes = base64ToBytes(trimmed);
    if (hasOtsHeader(bytes)) {
      return bytes;
    }
  }

  return undefined;
}

function hasOtsHeader(bytes: Uint8Array): boolean {
  if (bytes.length < OTS_HEADER_BYTES.length) {
    return false;
  }

  for (let index = 0; index < OTS_HEADER_BYTES.length; index += 1) {
    if (bytes[index] !== OTS_HEADER_BYTES[index]) {
      return false;
    }
  }

  return true;
}

function isBase64(value: string): boolean {
  if (!BASE64_PATTERN.test(value)) {
    return false;
  }

  const normalized = value.replace(/=+$/, "");
  const reencoded = bytesToBase64(base64ToBytes(value)).replace(/=+$/, "");
  return reencoded === normalized;
}

function getBitcoinAttestationHeights(detached: OtsDetachedTimestampFile): number[] {
  const heights: number[] = [];

  detached.timestamp.allAttestations().forEach((attestation) => {
    if (attestation instanceof OpenTimestamps.Notary.BitcoinBlockHeaderAttestation) {
      heights.push(attestation.height);
    }
  });

  return heights.filter((height) => Number.isSafeInteger(height) && height > 0);
}

function hasPendingAttestation(detached: OtsDetachedTimestampFile): boolean {
  let foundPending = false;

  detached.timestamp.allAttestations().forEach((attestation) => {
    if (attestation instanceof OpenTimestamps.Notary.PendingAttestation) {
      foundPending = true;
    }
  });

  return foundPending;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);

  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }

  return bytes;
}

function bytesToHex(value: number[]): string {
  return value.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64ToBytes(value: string): Uint8Array {
  const decoded = atob(value);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
}

function bytesToBase64(value: Uint8Array): string {
  let decoded = "";

  for (const byte of value) {
    decoded += String.fromCharCode(byte);
  }

  return btoa(decoded);
}
