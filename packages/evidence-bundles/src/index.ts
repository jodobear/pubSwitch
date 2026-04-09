import { PMA_KIND, PMU_KIND, PMX_KIND, type OtsProofSummary } from "../../protocol-a/src/index";
import { STA_KIND, STC_KIND } from "../../protocol-c/src/index";
import {
  getSingleTagValue,
  type EventId,
  type Hex32,
  type NostrEvent,
} from "../../protocol-shared/src/index";

export const PREPARED_BUNDLE_TYPE = "pubswitch-prepared-bundle";
export const SOCIAL_BUNDLE_TYPE = "pubswitch-social-bundle";
export const BUNDLE_VERSION = 1;

export type PreparedBundleProof = {
  targetEventId: EventId;
  otsEvent?: NostrEvent;
  otsBytesBase64?: string;
  summary?: OtsProofSummary;
};

export type PreparedBundle = {
  version: 1;
  type: typeof PREPARED_BUNDLE_TYPE;
  oldPubkey: Hex32;
  migrationPubkeys: Hex32[];
  successorPubkeys: Hex32[];
  events: NostrEvent[];
  otsProofs: PreparedBundleProof[];
  relays: string[];
};

export type SocialBundle = {
  version: 1;
  type: typeof SOCIAL_BUNDLE_TYPE;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  events: NostrEvent[];
  relays: string[];
};

export function buildPreparedBundle(input: {
  events: NostrEvent[];
  otsProofs?: PreparedBundleProof[];
  relays?: string[];
}): PreparedBundle {
  const authorityEvents = input.events.filter((event) =>
    [PMA_KIND, PMU_KIND, PMX_KIND].includes(event.kind),
  );
  const oldPubkey = authorityEvents.map((event) => getSingleTagValue(event, "o")).find(isHex32);
  if (!oldPubkey) {
    throw new Error("Prepared bundle needs at least one PMA/PMU/PMX event with an o tag");
  }

  return {
    version: BUNDLE_VERSION,
    type: PREPARED_BUNDLE_TYPE,
    oldPubkey,
    migrationPubkeys: [...new Set(authorityEvents.flatMap(extractMigrationPubkeys))],
    successorPubkeys: [...new Set(authorityEvents.flatMap(extractSuccessorPubkeys))],
    events: authorityEvents,
    otsProofs: input.otsProofs ?? [],
    relays: [...new Set(input.relays ?? [])],
  };
}

export function buildSocialBundle(input: {
  events: NostrEvent[];
  oldPubkey: Hex32;
  newPubkey: Hex32;
  relays?: string[];
}): SocialBundle {
  return {
    version: BUNDLE_VERSION,
    type: SOCIAL_BUNDLE_TYPE,
    oldPubkey: input.oldPubkey,
    newPubkey: input.newPubkey,
    events: input.events.filter((event) => [STC_KIND, STA_KIND].includes(event.kind)),
    relays: [...new Set(input.relays ?? [])],
  };
}

export function serializePreparedBundle(bundle: PreparedBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function serializeSocialBundle(bundle: SocialBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function parsePreparedBundle(text: string): PreparedBundle {
  const parsed = parseJsonObject(text, "prepared bundle");
  if (parsed.version !== BUNDLE_VERSION || parsed.type !== PREPARED_BUNDLE_TYPE) {
    throw new Error(`prepared bundle must have version ${BUNDLE_VERSION} and type ${PREPARED_BUNDLE_TYPE}`);
  }

  const events = asEventArray(parsed.events, "events");
  const otsProofs = asProofArray(parsed.otsProofs, "otsProofs");
  const relays = asStringArray(parsed.relays, "relays");
  const oldPubkey = asString(parsed.oldPubkey, "oldPubkey");
  const migrationPubkeys = asStringArray(parsed.migrationPubkeys, "migrationPubkeys");
  const successorPubkeys = asStringArray(parsed.successorPubkeys, "successorPubkeys");

  return {
    version: BUNDLE_VERSION,
    type: PREPARED_BUNDLE_TYPE,
    oldPubkey,
    migrationPubkeys,
    successorPubkeys,
    events,
    otsProofs,
    relays,
  };
}

export function parseSocialBundle(text: string): SocialBundle {
  const parsed = parseJsonObject(text, "social bundle");
  if (parsed.version !== BUNDLE_VERSION || parsed.type !== SOCIAL_BUNDLE_TYPE) {
    throw new Error(`social bundle must have version ${BUNDLE_VERSION} and type ${SOCIAL_BUNDLE_TYPE}`);
  }

  return {
    version: BUNDLE_VERSION,
    type: SOCIAL_BUNDLE_TYPE,
    oldPubkey: asString(parsed.oldPubkey, "oldPubkey"),
    newPubkey: asString(parsed.newPubkey, "newPubkey"),
    events: asEventArray(parsed.events, "events"),
    relays: asOptionalStringArray(parsed.relays, "relays"),
  };
}

function extractMigrationPubkeys(event: NostrEvent): string[] {
  if (event.kind === PMA_KIND) {
    return compact([getSingleTagValue(event, "m")]);
  }

  if (event.kind === PMU_KIND) {
    return compact([event.pubkey, getSingleTagValue(event, "u")]);
  }

  if (event.kind === PMX_KIND) {
    return compact([event.pubkey]);
  }

  return [];
}

function extractSuccessorPubkeys(event: NostrEvent): string[] {
  return event.kind === PMX_KIND ? compact([getSingleTagValue(event, "n")]) : [];
}

function compact(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function parseJsonObject(text: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} JSON parse failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }

  return parsed as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be a string array`);
  }
  return [...value] as string[];
}

function asOptionalStringArray(value: unknown, label: string): string[] {
  if (value === undefined) {
    return [];
  }
  return asStringArray(value, label);
}

function asEventArray(value: unknown, label: string): NostrEvent[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an event array`);
  }
  return value as NostrEvent[];
}

function asProofArray(value: unknown, label: string): PreparedBundleProof[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a proof array`);
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${label}[${index}] must be an object`);
    }

    const record = entry as Record<string, unknown>;
    const targetEventId = asString(record.targetEventId, `${label}[${index}].targetEventId`);
    const otsBytesBase64 =
      record.otsBytesBase64 === undefined ? undefined : asString(record.otsBytesBase64, `${label}[${index}].otsBytesBase64`);
    const summary = asProofSummary(record.summary, `${label}[${index}].summary`);

    return {
      targetEventId,
      otsEvent: record.otsEvent as NostrEvent | undefined,
      otsBytesBase64,
      summary,
    };
  });
}

function asProofSummary(value: unknown, label: string): OtsProofSummary | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  const record = value as Record<string, unknown>;
  if (record.ok === true) {
    const status = asString(record.status, `${label}.status`);
    const targetEventId = asString(record.targetEventId, `${label}.targetEventId`);
    const targetKind = asPositiveInteger(record.targetKind, `${label}.targetKind`);
    const proofEventId =
      record.proofEventId === undefined ? undefined : asString(record.proofEventId, `${label}.proofEventId`);

    if (status === "pending") {
      return {
        ok: true,
        status,
        targetEventId,
        targetKind,
        proofEventId,
      };
    }

    if (status === "bitcoin_confirmed") {
      return {
        ok: true,
        status,
        targetEventId,
        targetKind,
        proofEventId,
        anchorHeight: asPositiveInteger(record.anchorHeight, `${label}.anchorHeight`),
      };
    }

    throw new Error(`${label}.status must be pending or bitcoin_confirmed`);
  }

  if (record.ok === false) {
    return {
      ok: false,
      proofEventId:
        record.proofEventId === undefined ? undefined : asString(record.proofEventId, `${label}.proofEventId`),
      code: asString(record.code, `${label}.code`),
      reason: asString(record.reason, `${label}.reason`),
    };
  }

  throw new Error(`${label}.ok must be true or false`);
}

function asPositiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return value;
}

function isHex32(value: string | undefined): value is Hex32 {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
