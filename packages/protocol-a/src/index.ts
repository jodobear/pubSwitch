import {
  ProtocolError,
  assertLowercaseHex32,
  canonicalJsonArray,
  computeNostrEventIdSync,
  getSingleTagValue,
  getTagValues,
  sha256Hex,
  sha256HexSync,
  signNostrEventWithSecretKey,
  type UnsignedNostrEvent as SharedUnsignedNostrEvent,
  verifyNostrEventSignature,
  verifySchnorrDigestSignature,
  type EventId,
  type Hex32,
  type NostrEvent,
  type NostrTag,
} from "@tack/protocol-shared";

export * from "./v3";

export const PROTOCOL_A_EVENT_KINDS = [1776, 1779, 1777, 1040] as const;

export const PMA_KIND = 1776;
export const PMU_KIND = 1779;
export const PMX_KIND = 1777;
export const OTS_KIND = 1040;
export const VERIFIED_ANCHOR_HEIGHT_TAG = "x-verified-anchor-height";

const PMA_ALT = "Prepared Migration Authority";
const PMU_ALT = "Prepared Migration Authority Update";
const PMX_ALT = "Prepared Migration Execution";
const EVENT_ID_HEX_LENGTH = 64;
const SIGNATURE_HEX_LENGTH = 128;
const HEX_PATTERN = /^[0-9a-f]+$/;

export type UnsignedNostrEvent = SharedUnsignedNostrEvent;

export type SignerLike = {
  getPublicKey(): Promise<Hex32>;
  signEvent(event: UnsignedNostrEvent): Promise<NostrEvent>;
  signDigest?(digestHex: string): Promise<string>;
};

export type DetachedSignerLike = {
  getPublicKey(): Promise<Hex32>;
  signDigest(digestHex: string): Promise<string>;
};

export type PreparedMigrationState =
  | { state: "none" }
  | { state: "draft_local" }
  | { state: "published_pending_ots" }
  | { state: "bitcoin_confirmed"; authorityId: EventId }
  | { state: "executed"; authorityId: EventId; newPubkey: Hex32 }
  | {
      state: "conflict";
      conflictKind: "multiple_roots";
      anchorHeight: number;
      authorityIds: EventId[];
      reason: string;
    }
  | {
      state: "conflict";
      conflictKind: "multiple_children";
      authorityId: EventId;
      conflictingAuthorityIds: EventId[];
      reason: string;
    }
  | {
      state: "conflict";
      conflictKind: "multiple_executions";
      authorityId: EventId;
      conflictingExecutionIds: EventId[];
      reason: string;
    };

export type Invalid = {
  ok: false;
  code: string;
  reason: string;
  eventId?: EventId;
  matchingProofIds?: EventId[];
};

export type ValidatedPma = {
  ok: true;
  kind: "pma";
  authorityId: EventId;
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
  anchorHeight: number;
  proofEventIds: EventId[];
  signatureStatus: "verified";
  event: NostrEvent;
};

export type ValidatedPmu = {
  ok: true;
  kind: "pmu";
  authorityId: EventId;
  previousAuthorityId: EventId;
  previousAuthorityCanonicalId: EventId;
  oldPubkey: Hex32;
  currentMigrationPubkey: Hex32;
  nextMigrationPubkey: Hex32;
  anchorHeight: number;
  proofEventIds: EventId[];
  signatureStatus: "verified";
  event: NostrEvent;
};

export type ValidatedPmx = {
  ok: true;
  kind: "pmx";
  executionId: EventId;
  activeAuthorityId: EventId;
  activeAuthorityCanonicalId: EventId;
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
  newPubkey: Hex32;
  signatureStatus: "verified";
  event: NostrEvent;
};

export type AuthorityRecord = {
  kind: "pma" | "pmu";
  canonicalAuthorityId: EventId;
  authorityIds: EventId[];
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
  anchorHeight: number;
};

export type AuthorityIndex = Map<EventId, AuthorityRecord>;

export type ResolvePreparedMigrationInput = {
  oldPubkey: Hex32;
  events: NostrEvent[];
  otsProofs: NostrEvent[];
};

export async function buildPma(input: {
  oldSigner: SignerLike;
  migrationPubkey: Hex32;
  createdAt?: number;
}): Promise<NostrEvent> {
  assertLowercaseHex32(input.migrationPubkey, "migrationPubkey");

  const oldPubkey = await input.oldSigner.getPublicKey();
  assertLowercaseHex32(oldPubkey, "oldPubkey");

  if (oldPubkey === input.migrationPubkey) {
    throw new ProtocolError("migrationPubkey must not equal oldPubkey");
  }

  const unsignedEvent: UnsignedNostrEvent = {
    pubkey: oldPubkey,
    created_at: input.createdAt ?? Math.floor(Date.now() / 1000),
    kind: PMA_KIND,
    tags: [
      ["o", oldPubkey],
      ["m", input.migrationPubkey],
      ["alt", PMA_ALT],
    ],
    content: "",
  };

  const event = await input.oldSigner.signEvent(unsignedEvent);

  assertSignedEventShape(event, {
    expectedPubkey: oldPubkey,
    expectedKind: PMA_KIND,
    expectedContent: "",
    label: "PMA",
  });

  return event;
}

export async function buildPmu(input: {
  oldPubkey: Hex32;
  previousAuthorityId: EventId;
  currentMigrationSigner: SignerLike;
  nextMigrationPubkey: Hex32;
  oldDetachedSigner: DetachedSignerLike;
  nextDetachedSigner: DetachedSignerLike;
  createdAt?: number;
}): Promise<NostrEvent> {
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");
  assertLowercaseHex32(input.nextMigrationPubkey, "nextMigrationPubkey");
  assertEventId(input.previousAuthorityId, "previousAuthorityId");

  const currentMigrationPubkey = await input.currentMigrationSigner.getPublicKey();
  assertLowercaseHex32(currentMigrationPubkey, "currentMigrationPubkey");

  if (input.nextMigrationPubkey === input.oldPubkey) {
    throw new ProtocolError("nextMigrationPubkey must not equal oldPubkey");
  }

  if (input.nextMigrationPubkey === currentMigrationPubkey) {
    throw new ProtocolError("nextMigrationPubkey must not equal currentMigrationPubkey");
  }

  const oldDetachedPubkey = await input.oldDetachedSigner.getPublicKey();
  const nextDetachedPubkey = await input.nextDetachedSigner.getPublicKey();

  assertLowercaseHex32(oldDetachedPubkey, "oldDetachedPubkey");
  assertLowercaseHex32(nextDetachedPubkey, "nextDetachedPubkey");

  if (oldDetachedPubkey !== input.oldPubkey) {
    throw new ProtocolError("oldDetachedSigner pubkey does not match oldPubkey");
  }

  if (nextDetachedPubkey !== input.nextMigrationPubkey) {
    throw new ProtocolError("nextDetachedSigner pubkey does not match nextMigrationPubkey");
  }

  const createdAt = input.createdAt ?? Math.floor(Date.now() / 1000);
  const detachedDigest = await computePmuDetachedSignDigest({
    oldPubkey: input.oldPubkey,
    previousAuthorityId: input.previousAuthorityId,
    currentMigrationPubkey,
    nextMigrationPubkey: input.nextMigrationPubkey,
    createdAt,
  });

  const oldSignature = await input.oldDetachedSigner.signDigest(detachedDigest);
  const nextSignature = await input.nextDetachedSigner.signDigest(detachedDigest);

  assertSignatureHex(oldSignature, "oldDetachedSignature");
  assertSignatureHex(nextSignature, "nextDetachedSignature");

  const unsignedEvent: UnsignedNostrEvent = {
    pubkey: currentMigrationPubkey,
    created_at: createdAt,
    kind: PMU_KIND,
    tags: [
      ["o", input.oldPubkey],
      ["e", input.previousAuthorityId],
      ["u", input.nextMigrationPubkey],
      ["os", oldSignature],
      ["ns", nextSignature],
      ["alt", PMU_ALT],
    ],
    content: "",
  };

  const event = await input.currentMigrationSigner.signEvent(unsignedEvent);

  assertSignedEventShape(event, {
    expectedPubkey: currentMigrationPubkey,
    expectedKind: PMU_KIND,
    expectedContent: "",
    label: "PMU",
  });

  return event;
}

export async function buildPmx(input: {
  authorityId: EventId;
  oldPubkey: Hex32;
  migrationSigner: SignerLike;
  newSigner: SignerLike;
  createdAt?: number;
}): Promise<NostrEvent> {
  assertEventId(input.authorityId, "authorityId");
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");

  const migrationPubkey = await input.migrationSigner.getPublicKey();
  const newPubkey = await input.newSigner.getPublicKey();

  assertLowercaseHex32(migrationPubkey, "migrationPubkey");
  assertLowercaseHex32(newPubkey, "newPubkey");

  if (newPubkey === input.oldPubkey) {
    throw new ProtocolError("newPubkey must not equal oldPubkey");
  }

  const createdAt = input.createdAt ?? Math.floor(Date.now() / 1000);
  const detachedDigest = await computePmxDetachedSignDigest({
    authorityId: input.authorityId,
    oldPubkey: input.oldPubkey,
    newPubkey,
    createdAt,
  });
  const successorSignature = await signWithSignerDigest(input.newSigner, detachedDigest);

  const unsignedEvent: UnsignedNostrEvent = {
    pubkey: migrationPubkey,
    created_at: createdAt,
    kind: PMX_KIND,
    tags: [
      ["o", input.oldPubkey],
      ["n", newPubkey],
      ["e", input.authorityId],
      ["ns", successorSignature],
      ["alt", PMX_ALT],
    ],
    content: "",
  };

  const event = await input.migrationSigner.signEvent(unsignedEvent);

  assertSignedEventShape(event, {
    expectedPubkey: migrationPubkey,
    expectedKind: PMX_KIND,
    expectedContent: "",
    label: "PMX",
  });

  return event;
}

export function validatePma(event: NostrEvent, otsProofs: NostrEvent[]): ValidatedPma | Invalid {
  const fields = validatePmaFields(event);
  if (!fields.ok) {
    return fields;
  }

  const otsStatus = assessAuthorityOtsProofs(fields.event, otsProofs, PMA_KIND);

  if (otsStatus.status === "none") {
    return {
      ok: false,
      code: "missing_ots",
      reason: "PMA has no matching 1040 proof event",
      eventId: fields.authorityId,
    };
  }

  if (otsStatus.status === "pending") {
    return {
      ok: false,
      code: "pending_ots",
      reason: "PMA has matching 1040 proof events but no verified Bitcoin anchor height yet",
      eventId: fields.authorityId,
      matchingProofIds: otsStatus.proofEventIds,
    };
  }

  return {
    ok: true,
    kind: "pma",
    authorityId: fields.authorityId,
    oldPubkey: fields.oldPubkey,
    migrationPubkey: fields.migrationPubkey,
    anchorHeight: otsStatus.anchorHeight,
    proofEventIds: otsStatus.proofEventIds,
    signatureStatus: "verified",
    event: fields.event,
  };
}

export function validatePmu(
  event: NostrEvent,
  authorityIndex: AuthorityIndex,
  otsProofs: NostrEvent[],
): ValidatedPmu | Invalid {
  const fields = validatePmuFields(event, authorityIndex);
  if (!fields.ok) {
    return fields;
  }

  const otsStatus = assessAuthorityOtsProofs(fields.event, otsProofs, PMU_KIND);

  if (otsStatus.status === "none") {
    return {
      ok: false,
      code: "missing_ots",
      reason: "PMU has no matching 1040 proof event",
      eventId: fields.authorityId,
    };
  }

  if (otsStatus.status === "pending") {
    return {
      ok: false,
      code: "pending_ots",
      reason: "PMU has matching 1040 proof events but no verified Bitcoin anchor height yet",
      eventId: fields.authorityId,
      matchingProofIds: otsStatus.proofEventIds,
    };
  }

  return {
    ok: true,
    kind: "pmu",
    authorityId: fields.authorityId,
    previousAuthorityId: fields.previousAuthorityId,
    previousAuthorityCanonicalId: fields.previousAuthority.canonicalAuthorityId,
    oldPubkey: fields.oldPubkey,
    currentMigrationPubkey: fields.currentMigrationPubkey,
    nextMigrationPubkey: fields.nextMigrationPubkey,
    anchorHeight: otsStatus.anchorHeight,
    proofEventIds: otsStatus.proofEventIds,
    signatureStatus: "verified",
    event: fields.event,
  };
}

export function validatePmx(
  event: NostrEvent,
  activeAuthority: AuthorityRecord,
): ValidatedPmx | Invalid {
  const fields = validatePmxFields(event, activeAuthority);
  if (!fields.ok) {
    return fields;
  }

  return {
    ok: true,
    kind: "pmx",
    executionId: fields.executionId,
    activeAuthorityId: fields.activeAuthorityId,
    activeAuthorityCanonicalId: fields.activeAuthority.canonicalAuthorityId,
    oldPubkey: fields.oldPubkey,
    migrationPubkey: fields.migrationPubkey,
    newPubkey: fields.newPubkey,
    signatureStatus: "verified",
    event: fields.event,
  };
}

export function resolvePreparedMigration(
  input: ResolvePreparedMigrationInput,
): PreparedMigrationState {
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");

  const drafts = input.events.filter((event) => isDraftPmaCandidate(event, input.oldPubkey));
  const pendingRoots: string[] = [];
  const confirmedRoots: ValidatedPma[] = [];

  for (const event of input.events) {
    if (event.kind !== PMA_KIND || event.pubkey !== input.oldPubkey) {
      continue;
    }

    const validated = validatePma(event, input.otsProofs);
    if (validated.ok) {
      confirmedRoots.push(validated);
      continue;
    }

    if (validated.code === "pending_ots") {
      pendingRoots.push(validated.eventId ?? "(missing-id)");
    }
  }

  if (confirmedRoots.length === 0) {
    if (pendingRoots.length > 0) {
      return { state: "published_pending_ots" };
    }

    if (drafts.length > 0) {
      return { state: "draft_local" };
    }

    return { state: "none" };
  }

  const rootGroups = groupValidatedPmas(confirmedRoots);
  const minimumAnchorHeight = Math.min(...rootGroups.map((root) => root.anchorHeight));
  const earliestRoots = rootGroups.filter((root) => root.anchorHeight === minimumAnchorHeight);

  if (earliestRoots.length > 1) {
    return {
      state: "conflict",
      conflictKind: "multiple_roots",
      anchorHeight: minimumAnchorHeight,
      authorityIds: earliestRoots.map((root) => root.canonicalAuthorityId),
      reason: `multiple confirmed PMA roots share anchor height ${minimumAnchorHeight}`,
    };
  }

  let activeAuthority = earliestRoots[0];
  const authorityIndex = createAuthorityIndex([activeAuthority]);

  while (true) {
    const childCandidates = input.events.filter(
      (event) =>
        event.kind === PMU_KIND &&
        activeAuthority.authorityIds.includes(getSingleTagValue(event, "e") ?? ""),
    );

    const confirmedChildren: ValidatedPmu[] = [];

    for (const event of childCandidates) {
      const validated = validatePmu(event, authorityIndex, input.otsProofs);
      if (validated.ok) {
        confirmedChildren.push(validated);
      }
    }

    const childGroups = groupValidatedPmus(confirmedChildren);

    if (childGroups.length === 0) {
      break;
    }

    if (childGroups.length > 1) {
      return {
        state: "conflict",
        conflictKind: "multiple_children",
        authorityId: activeAuthority.canonicalAuthorityId,
        conflictingAuthorityIds: childGroups.map((child) => child.canonicalAuthorityId),
        reason: `multiple confirmed PMU children reference authority ${activeAuthority.canonicalAuthorityId}`,
      };
    }

    activeAuthority = childGroups[0];
    mergeAuthorityIndex(authorityIndex, activeAuthority);
  }

  const executionCandidates = input.events.filter(
    (event) =>
      event.kind === PMX_KIND &&
      activeAuthority.authorityIds.includes(getSingleTagValue(event, "e") ?? ""),
  );

  const validExecutions: ValidatedPmx[] = [];

  for (const event of executionCandidates) {
    const validated = validatePmx(event, activeAuthority);
    if (validated.ok) {
      validExecutions.push(validated);
    }
  }

  const executionGroups = groupValidatedPmxs(validExecutions);

  if (executionGroups.length === 0) {
    return {
      state: "bitcoin_confirmed",
      authorityId: activeAuthority.canonicalAuthorityId,
    };
  }

  if (executionGroups.length > 1) {
    return {
      state: "conflict",
      conflictKind: "multiple_executions",
      authorityId: activeAuthority.canonicalAuthorityId,
      conflictingExecutionIds: executionGroups.map((execution) => execution.canonicalExecutionId),
      reason: `multiple confirmed PMX executions reference authority ${activeAuthority.canonicalAuthorityId}`,
    };
  }

  return {
    state: "executed",
    authorityId: activeAuthority.canonicalAuthorityId,
    newPubkey: executionGroups[0].newPubkey,
  };
}

export function toAuthorityRecord(authority: ValidatedPma | ValidatedPmu): AuthorityRecord {
  if (authority.kind === "pma") {
    return {
      kind: "pma",
      canonicalAuthorityId: authority.authorityId,
      authorityIds: [authority.authorityId],
      oldPubkey: authority.oldPubkey,
      migrationPubkey: authority.migrationPubkey,
      anchorHeight: authority.anchorHeight,
    };
  }

  return {
    kind: "pmu",
    canonicalAuthorityId: authority.authorityId,
    authorityIds: [authority.authorityId],
    oldPubkey: authority.oldPubkey,
    migrationPubkey: authority.nextMigrationPubkey,
    anchorHeight: authority.anchorHeight,
  };
}

export function createAuthorityIndex(authorities: AuthorityRecord[]): AuthorityIndex {
  const index: AuthorityIndex = new Map();

  for (const authority of authorities) {
    mergeAuthorityIndex(index, authority);
  }

  return index;
}

export async function computeNostrEventId(event: UnsignedNostrEvent | NostrEvent): Promise<EventId> {
  return computeNostrEventIdSync(event);
}

export async function computePmuDetachedSignDigest(input: {
  oldPubkey: Hex32;
  previousAuthorityId: EventId;
  currentMigrationPubkey: Hex32;
  nextMigrationPubkey: Hex32;
  createdAt: number;
}): Promise<string> {
  return computePmuDetachedSignDigestSync(input);
}

function computePmuDetachedSignDigestSync(input: {
  oldPubkey: Hex32;
  previousAuthorityId: EventId;
  currentMigrationPubkey: Hex32;
  nextMigrationPubkey: Hex32;
  createdAt: number;
}): string {
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");
  assertEventId(input.previousAuthorityId, "previousAuthorityId");
  assertLowercaseHex32(input.currentMigrationPubkey, "currentMigrationPubkey");
  assertLowercaseHex32(input.nextMigrationPubkey, "nextMigrationPubkey");

  const preimage = canonicalJsonArray([
    "NIP-XX",
    "prepared-migration-update",
    1,
    input.oldPubkey,
    input.previousAuthorityId,
    input.currentMigrationPubkey,
    input.nextMigrationPubkey,
    input.createdAt,
  ]);

  return sha256HexSync(preimage);
}

export async function computePmxDetachedSignDigest(input: {
  authorityId: EventId;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  createdAt: number;
}): Promise<string> {
  return computePmxDetachedSignDigestSync(input);
}

function computePmxDetachedSignDigestSync(input: {
  authorityId: EventId;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  createdAt: number;
}): string {
  assertEventId(input.authorityId, "authorityId");
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");
  assertLowercaseHex32(input.newPubkey, "newPubkey");

  const preimage = canonicalJsonArray([
    "NIP-XX",
    "prepared-migration-execution",
    1,
    input.authorityId,
    input.oldPubkey,
    input.newPubkey,
    input.createdAt,
  ]);

  return sha256HexSync(preimage);
}

type ValidatedPmaFields = {
  ok: true;
  event: NostrEvent;
  authorityId: EventId;
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
};

type ValidatedPmuFields = {
  ok: true;
  event: NostrEvent;
  authorityId: EventId;
  previousAuthorityId: EventId;
  previousAuthority: AuthorityRecord;
  oldPubkey: Hex32;
  currentMigrationPubkey: Hex32;
  nextMigrationPubkey: Hex32;
};

type ValidatedPmxFields = {
  ok: true;
  event: NostrEvent;
  executionId: EventId;
  activeAuthorityId: EventId;
  activeAuthority: AuthorityRecord;
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
  newPubkey: Hex32;
};

type OtsAssessment =
  | { status: "none" }
  | { status: "pending"; proofEventIds: EventId[] }
  | { status: "bitcoin_confirmed"; anchorHeight: number; proofEventIds: EventId[] };

type AuthorityGroup = AuthorityRecord;
type ExecutionGroup = {
  canonicalExecutionId: EventId;
  executionIds: EventId[];
  activeAuthorityCanonicalId: EventId;
  oldPubkey: Hex32;
  newPubkey: Hex32;
};

function validatePmaFields(event: NostrEvent): ValidatedPmaFields | Invalid {
  if (event.kind !== PMA_KIND) {
    return invalid("wrong_kind", "PMA kind must be 1776");
  }

  if (event.content !== "") {
    return invalid("non_empty_content", "PMA content must be empty");
  }

  try {
    assertLowercaseHex32(event.pubkey, "event.pubkey");
  } catch (error) {
    return invalid("invalid_pubkey", getErrorMessage(error));
  }

  const oValues = getTagValues(event, "o");
  if (oValues.length !== 1) {
    return invalid("invalid_o_tag", "PMA must contain exactly one o tag");
  }

  const mValues = getTagValues(event, "m");
  if (mValues.length !== 1) {
    return invalid("invalid_m_tag", "PMA must contain exactly one m tag");
  }

  if (getTagValues(event, "e").length > 0) {
    return invalid("unexpected_e_tag", "PMA must not contain an e tag");
  }

  const oldPubkey = oValues[0];
  const migrationPubkey = mValues[0];

  try {
    assertLowercaseHex32(oldPubkey, "o");
    assertLowercaseHex32(migrationPubkey, "m");
  } catch (error) {
    return invalid("invalid_pubkey_tag", getErrorMessage(error));
  }

  if (oldPubkey !== event.pubkey) {
    return invalid("old_pubkey_mismatch", "PMA o tag must equal the event pubkey");
  }

  if (migrationPubkey === oldPubkey) {
    return invalid("self_migration_key", "PMA migration pubkey must differ from the old pubkey");
  }

  const authorityId = validateSignedEventEnvelope(event, "PMA");
  if (!authorityId.ok) {
    return authorityId;
  }

  return {
    ok: true,
    event,
    authorityId: authorityId.authorityId,
    oldPubkey,
    migrationPubkey,
  };
}

function validatePmuFields(event: NostrEvent, authorityIndex: AuthorityIndex): ValidatedPmuFields | Invalid {
  if (event.kind !== PMU_KIND) {
    return invalid("wrong_kind", "PMU kind must be 1779");
  }

  if (event.content !== "") {
    return invalid("non_empty_content", "PMU content must be empty");
  }

  try {
    assertLowercaseHex32(event.pubkey, "event.pubkey");
  } catch (error) {
    return invalid("invalid_pubkey", getErrorMessage(error));
  }

  const oValues = getTagValues(event, "o");
  const eValues = getTagValues(event, "e");
  const uValues = getTagValues(event, "u");
  const osValues = getTagValues(event, "os");
  const nsValues = getTagValues(event, "ns");

  if (oValues.length !== 1) {
    return invalid("invalid_o_tag", "PMU must contain exactly one o tag");
  }

  if (eValues.length !== 1) {
    return invalid("invalid_e_tag", "PMU must contain exactly one e tag");
  }

  if (uValues.length !== 1) {
    return invalid("invalid_u_tag", "PMU must contain exactly one u tag");
  }

  if (osValues.length !== 1) {
    return invalid("invalid_os_tag", "PMU must contain exactly one os tag");
  }

  if (nsValues.length !== 1) {
    return invalid("invalid_ns_tag", "PMU must contain exactly one ns tag");
  }

  const oldPubkey = oValues[0];
  const previousAuthorityId = eValues[0];
  const nextMigrationPubkey = uValues[0];
  const oldDetachedSignature = osValues[0];
  const nextDetachedSignature = nsValues[0];

  try {
    assertLowercaseHex32(oldPubkey, "o");
    assertEventId(previousAuthorityId, "e");
    assertLowercaseHex32(nextMigrationPubkey, "u");
    assertSignatureHex(oldDetachedSignature, "os");
    assertSignatureHex(nextDetachedSignature, "ns");
  } catch (error) {
    return invalid("invalid_pmu_tag", getErrorMessage(error));
  }

  if (nextMigrationPubkey === oldPubkey) {
    return invalid("self_migration_key", "PMU next migration pubkey must differ from the old pubkey");
  }

  if (nextMigrationPubkey === event.pubkey) {
    return invalid(
      "same_current_and_next_key",
      "PMU next migration pubkey must differ from the event pubkey",
    );
  }

  const previousAuthority = authorityIndex.get(previousAuthorityId);
  if (!previousAuthority) {
    return invalid("unknown_previous_authority", "PMU previous authority is not known or confirmed");
  }

  if (previousAuthority.oldPubkey !== oldPubkey) {
    return invalid("old_pubkey_mismatch", "PMU old pubkey must match the referenced authority");
  }

  if (previousAuthority.migrationPubkey !== event.pubkey) {
    return invalid(
      "current_migration_mismatch",
      "PMU event pubkey must equal the migration pubkey authorized by the referenced authority",
    );
  }

  const authorityId = validateSignedEventEnvelope(event, "PMU");
  if (!authorityId.ok) {
    return authorityId;
  }

  const detachedDigest = computePmuDetachedSignDigestSync({
    oldPubkey,
    previousAuthorityId,
    currentMigrationPubkey: event.pubkey,
    nextMigrationPubkey,
    createdAt: event.created_at,
  });

  if (
    !verifySchnorrDigestSignature({
      messageHashHex: detachedDigest,
      signatureHex: oldDetachedSignature,
      pubkeyHex: oldPubkey,
    })
  ) {
    return invalid("invalid_os_sig", "PMU os tag must be a valid Schnorr signature over the detached digest");
  }

  if (
    !verifySchnorrDigestSignature({
      messageHashHex: detachedDigest,
      signatureHex: nextDetachedSignature,
      pubkeyHex: nextMigrationPubkey,
    })
  ) {
    return invalid("invalid_ns_sig", "PMU ns tag must be a valid Schnorr signature over the detached digest");
  }

  return {
    ok: true,
    event,
    authorityId: authorityId.authorityId,
    previousAuthorityId,
    previousAuthority,
    oldPubkey,
    currentMigrationPubkey: event.pubkey,
    nextMigrationPubkey,
  };
}

function validatePmxFields(event: NostrEvent, activeAuthority: AuthorityRecord): ValidatedPmxFields | Invalid {
  if (event.kind !== PMX_KIND) {
    return invalid("wrong_kind", "PMX kind must be 1777");
  }

  if (event.content !== "") {
    return invalid("non_empty_content", "PMX content must be empty");
  }

  try {
    assertLowercaseHex32(event.pubkey, "event.pubkey");
  } catch (error) {
    return invalid("invalid_pubkey", getErrorMessage(error));
  }

  const oValues = getTagValues(event, "o");
  const nValues = getTagValues(event, "n");
  const eValues = getTagValues(event, "e");
  const nsValues = getTagValues(event, "ns");

  if (oValues.length !== 1) {
    return invalid("invalid_o_tag", "PMX must contain exactly one o tag");
  }

  if (nValues.length !== 1) {
    return invalid("invalid_n_tag", "PMX must contain exactly one n tag");
  }

  if (eValues.length !== 1) {
    return invalid("invalid_e_tag", "PMX must contain exactly one e tag");
  }

  if (nsValues.length !== 1) {
    return invalid("invalid_ns_tag", "PMX must contain exactly one ns tag");
  }

  const oldPubkey = oValues[0];
  const newPubkey = nValues[0];
  const activeAuthorityId = eValues[0];
  const successorSignature = nsValues[0];

  try {
    assertLowercaseHex32(oldPubkey, "o");
    assertLowercaseHex32(newPubkey, "n");
    assertEventId(activeAuthorityId, "e");
    assertSignatureHex(successorSignature, "ns");
  } catch (error) {
    return invalid("invalid_pmx_tag", getErrorMessage(error));
  }

  if (newPubkey === oldPubkey) {
    return invalid("same_old_and_new_key", "PMX new pubkey must differ from the old pubkey");
  }

  if (!activeAuthority.authorityIds.includes(activeAuthorityId)) {
    return invalid("stale_authority_reference", "PMX must reference the active confirmed authority");
  }

  if (activeAuthority.oldPubkey !== oldPubkey) {
    return invalid("old_pubkey_mismatch", "PMX old pubkey must match the active authority");
  }

  if (activeAuthority.migrationPubkey !== event.pubkey) {
    return invalid(
      "current_migration_mismatch",
      "PMX event pubkey must equal the migration pubkey authorized by the active authority",
    );
  }

  const executionId = validateSignedEventEnvelope(event, "PMX");
  if (!executionId.ok) {
    return executionId;
  }

  const detachedDigest = computePmxDetachedSignDigestSync({
    authorityId: activeAuthorityId,
    oldPubkey,
    newPubkey,
    createdAt: event.created_at,
  });

  if (
    !verifySchnorrDigestSignature({
      messageHashHex: detachedDigest,
      signatureHex: successorSignature,
      pubkeyHex: newPubkey,
    })
  ) {
    return invalid("invalid_ns_sig", "PMX ns tag must be a valid Schnorr signature over the detached digest");
  }

  return {
    ok: true,
    event,
    executionId: executionId.authorityId,
    activeAuthorityId,
    activeAuthority,
    oldPubkey,
    migrationPubkey: event.pubkey,
    newPubkey,
  };
}

function validateSignedEventEnvelope(
  event: NostrEvent,
  label: string,
): { ok: true; authorityId: EventId } | Invalid {
  if (!event.id) {
    return invalid("missing_id", `${label} is missing an event id`);
  }

  if (!isLowercaseHexOfLength(event.id, EVENT_ID_HEX_LENGTH)) {
    return invalid("invalid_id", `${label} event id must be 32-byte lowercase hex`);
  }

  if (!event.sig) {
    return invalid("missing_sig", `${label} is missing an event signature`);
  }

  if (!isLowercaseHexOfLength(event.sig, SIGNATURE_HEX_LENGTH)) {
    return invalid("invalid_sig", `${label} event signature must be 64-byte lowercase hex`);
  }

  if (!verifyNostrEventSignature(event)) {
    return invalid("invalid_sig", `${label} event signature must pass Schnorr verification`);
  }

  return { ok: true, authorityId: event.id };
}

function assessAuthorityOtsProofs(
  event: NostrEvent,
  otsProofs: NostrEvent[],
  targetKind: number,
): OtsAssessment {
  const matchingProofs = otsProofs.filter(
    (proof) =>
      proof.kind === OTS_KIND &&
      proof.content.length > 0 &&
      getSingleTagValue(proof, "e") === event.id &&
      getSingleTagValue(proof, "k") === String(targetKind),
  );

  if (matchingProofs.length === 0) {
    return { status: "none" };
  }

  const confirmedProofs = matchingProofs
    .map((proof) => {
      const anchorHeight = parsePositiveIntegerTag(proof.tags, VERIFIED_ANCHOR_HEIGHT_TAG);
      if (anchorHeight === undefined || !proof.id) {
        return undefined;
      }

      return { id: proof.id, anchorHeight };
    })
    .filter((proof): proof is { id: EventId; anchorHeight: number } => proof !== undefined);

  if (confirmedProofs.length === 0) {
    return {
      status: "pending",
      proofEventIds: matchingProofs.flatMap((proof) => (proof.id ? [proof.id] : [])),
    };
  }

  return {
    status: "bitcoin_confirmed",
    anchorHeight: Math.min(...confirmedProofs.map((proof) => proof.anchorHeight)),
    proofEventIds: confirmedProofs.map((proof) => proof.id),
  };
}

function groupValidatedPmas(roots: ValidatedPma[]): AuthorityGroup[] {
  const groups = new Map<string, AuthorityGroup>();

  for (const root of roots) {
    const key = `${root.oldPubkey}:${root.migrationPubkey}:${root.anchorHeight}`;
    const existing = groups.get(key);

    if (existing) {
      existing.authorityIds.push(root.authorityId);
      continue;
    }

    groups.set(key, {
      kind: "pma",
      canonicalAuthorityId: root.authorityId,
      authorityIds: [root.authorityId],
      oldPubkey: root.oldPubkey,
      migrationPubkey: root.migrationPubkey,
      anchorHeight: root.anchorHeight,
    });
  }

  return [...groups.values()];
}

function groupValidatedPmus(children: ValidatedPmu[]): AuthorityGroup[] {
  const groups = new Map<string, AuthorityGroup>();

  for (const child of children) {
    const key = `${child.previousAuthorityCanonicalId}:${child.oldPubkey}:${child.currentMigrationPubkey}:${child.nextMigrationPubkey}`;
    const existing = groups.get(key);

    if (existing) {
      existing.authorityIds.push(child.authorityId);
      existing.anchorHeight = Math.min(existing.anchorHeight, child.anchorHeight);
      continue;
    }

    groups.set(key, {
      kind: "pmu",
      canonicalAuthorityId: child.authorityId,
      authorityIds: [child.authorityId],
      oldPubkey: child.oldPubkey,
      migrationPubkey: child.nextMigrationPubkey,
      anchorHeight: child.anchorHeight,
    });
  }

  return [...groups.values()];
}

function groupValidatedPmxs(executions: ValidatedPmx[]): ExecutionGroup[] {
  const groups = new Map<string, ExecutionGroup>();

  for (const execution of executions) {
    const key = `${execution.activeAuthorityCanonicalId}:${execution.oldPubkey}:${execution.newPubkey}`;
    const existing = groups.get(key);

    if (existing) {
      existing.executionIds.push(execution.executionId);
      continue;
    }

    groups.set(key, {
      canonicalExecutionId: execution.executionId,
      executionIds: [execution.executionId],
      activeAuthorityCanonicalId: execution.activeAuthorityCanonicalId,
      oldPubkey: execution.oldPubkey,
      newPubkey: execution.newPubkey,
    });
  }

  return [...groups.values()];
}

function mergeAuthorityIndex(index: AuthorityIndex, authority: AuthorityRecord): void {
  for (const authorityId of authority.authorityIds) {
    index.set(authorityId, authority);
  }
}

function isDraftPmaCandidate(event: NostrEvent, oldPubkey: Hex32): boolean {
  if (event.kind !== PMA_KIND || event.pubkey !== oldPubkey || event.content !== "") {
    return false;
  }

  const oValue = getSingleTagValue(event, "o");
  const mValue = getSingleTagValue(event, "m");

  if (!oValue || !mValue || getTagValues(event, "e").length > 0) {
    return false;
  }

  try {
    assertLowercaseHex32(oValue, "o");
    assertLowercaseHex32(mValue, "m");
  } catch {
    return false;
  }

  return oValue === oldPubkey && mValue !== oldPubkey && event.id === undefined && event.sig === undefined;
}

function invalid(code: string, reason: string): Invalid {
  return { ok: false, code, reason };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isLowercaseHexOfLength(value: string, length: number): boolean {
  return value.length === length && HEX_PATTERN.test(value);
}

function parsePositiveIntegerTag(tags: NostrTag[], tagName: string): number | undefined {
  const value = getSingleTagValue({ tags }, tagName);
  if (!value || !/^[1-9][0-9]*$/.test(value)) {
    return undefined;
  }

  return Number.parseInt(value, 10);
}

function assertEventId(value: string, label: string): void {
  if (!isLowercaseHexOfLength(value, EVENT_ID_HEX_LENGTH)) {
    throw new ProtocolError(`${label} must be 32-byte lowercase hex`);
  }
}

function assertSignatureHex(value: string, label: string): void {
  if (!isLowercaseHexOfLength(value, SIGNATURE_HEX_LENGTH)) {
    throw new ProtocolError(`${label} must be 64-byte lowercase hex`);
  }
}

function assertSignedEventShape(
  event: NostrEvent,
  input: {
    expectedPubkey: Hex32;
    expectedKind: number;
    expectedContent: string;
    label: string;
  },
): void {
  if (event.pubkey !== input.expectedPubkey) {
    throw new ProtocolError(`signed ${input.label} pubkey does not match the requested signer`);
  }

  if (event.kind !== input.expectedKind) {
    throw new ProtocolError(`signed ${input.label} kind does not match the requested kind`);
  }

  if (event.content !== input.expectedContent) {
    throw new ProtocolError(`signed ${input.label} content does not match the requested content`);
  }

  if (!event.id) {
    throw new ProtocolError(`signed ${input.label} is missing an event id`);
  }

  if (!event.sig) {
    throw new ProtocolError(`signed ${input.label} is missing an event signature`);
  }

  if (!verifyNostrEventSignature(event)) {
    throw new ProtocolError(`signed ${input.label} failed Schnorr event-signature verification`);
  }
}

async function signWithSignerDigest(signer: SignerLike, digestHex: string): Promise<string> {
  if (typeof signer.signDigest !== "function") {
    throw new ProtocolError("signer does not support detached digest signing");
  }

  const pubkey = await signer.getPublicKey();
  const signature = await signer.signDigest(digestHex);
  assertSignatureHex(signature, "detachedSignature");

  if (
    !verifySchnorrDigestSignature({
      messageHashHex: digestHex,
      signatureHex: signature,
      pubkeyHex: pubkey,
    })
  ) {
    throw new ProtocolError("signer returned an invalid detached Schnorr signature");
  }

  return signature;
}
