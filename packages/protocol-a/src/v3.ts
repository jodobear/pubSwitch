import {
  ProtocolError,
  assertLowercaseHex32,
  canonicalJsonArray,
  computeNostrEventIdSync,
  getSingleTagValue,
  getTagValues,
  hexToBytes,
  sha256HexSync,
  utf8,
  verifyNostrEventSignature,
  verifySchnorrDigestSignature,
  type EventId,
  type Hex32,
  type NostrEvent,
} from "@tack/protocol-shared";

export const PMA_KIND_V3 = 1776;
export const PMU_KIND_V3 = 1779;
export const PMX_KIND_V3 = 1777;
export const OTS_KIND_V3 = 1040;
export const PMA_ALT_V3 = "Prepared Migration Authority";
export const PMU_ALT_V3 = "Prepared Migration Authority Update";
export const PMX_ALT_V3 = "Prepared Migration Execution";

const EVENT_ID_HEX_LENGTH = 64;
const SIGNATURE_HEX_LENGTH = 128;
const HEX_PATTERN = /^[0-9a-f]+$/;
const LEGACY_VERIFIED_ANCHOR_HEIGHT_TAG = "x-verified-anchor-height";

type UnsignedNostrEvent = Omit<NostrEvent, "id" | "sig">;

type SignerLike = {
  getPublicKey(): Promise<Hex32>;
  signEvent(event: UnsignedNostrEvent): Promise<NostrEvent>;
  signDigest?(digestHex: string): Promise<string>;
};

type DetachedSignerLike = {
  getPublicKey(): Promise<Hex32>;
  signDigest(digestHex: string): Promise<string>;
};

export type OtsProofSummary =
  | {
      ok: true;
      targetEventId: EventId;
      targetKind: number;
      proofEventId?: EventId;
      status: "pending";
    }
  | {
      ok: true;
      targetEventId: EventId;
      targetKind: number;
      proofEventId?: EventId;
      status: "bitcoin_confirmed";
      anchorHeight: number;
    }
  | {
      ok: false;
      proofEventId?: EventId;
      code: string;
      reason: string;
    };

export type ValidatedPmaV3 = {
  ok: true;
  kind: "pma";
  authorityId: EventId;
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
  anchorHeight: number;
  proofEventIds: EventId[];
  event: NostrEvent;
};

export type ValidatedPmuV3 = {
  ok: true;
  kind: "pmu";
  authorityId: EventId;
  rootAuthorityId: EventId;
  previousAuthorityId: EventId;
  oldPubkey: Hex32;
  currentMigrationPubkey: Hex32;
  nextMigrationPubkey: Hex32;
  anchorHeight: number;
  proofEventIds: EventId[];
  event: NostrEvent;
};

export type ValidatedPmxV3 = {
  ok: true;
  kind: "pmx";
  executionId: EventId;
  transitionId: string;
  rootAuthorityId: EventId;
  activeAuthorityId: EventId;
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
  newPubkey: Hex32;
  event: NostrEvent;
};

export type InvalidV3 = {
  ok: false;
  code: string;
  reason: string;
  eventId?: EventId;
  proofEventIds?: EventId[];
};

export type PreparedMigrationRootGroup = {
  canonicalAuthorityId: EventId;
  authorityIds: EventId[];
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
  anchorHeight: number;
};

export type PreparedMigrationAuthoritySet = {
  canonicalAuthorityId: EventId;
  authorityIds: EventId[];
  rootAuthorityCanonicalId: EventId;
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
  anchorHeight: number;
};

export type PreparedMigrationExecutionSet = {
  canonicalExecutionId: EventId;
  executionIds: EventId[];
  newPubkey: Hex32;
};

export type PreparedMigrationV3State =
  | { state: "none" }
  | {
      state: "prepared_enrolled";
      root: PreparedMigrationRootGroup;
      activeAuthority: PreparedMigrationAuthoritySet;
    }
  | {
      state: "prepared_migrated";
      root: PreparedMigrationRootGroup;
      activeAuthority: PreparedMigrationAuthoritySet;
      execution: PreparedMigrationExecutionSet;
      newPubkey: Hex32;
    }
  | {
      state: "conflicting_roots";
      anchorHeight: number;
      roots: PreparedMigrationRootGroup[];
    }
  | {
      state: "conflicting_authority_updates";
      root: PreparedMigrationRootGroup;
      activeAuthority: PreparedMigrationAuthoritySet;
      conflictingAuthorities: PreparedMigrationAuthoritySet[];
    }
  | {
      state: "conflicting_executions";
      root: PreparedMigrationRootGroup;
      activeAuthority: PreparedMigrationAuthoritySet;
      conflictingExecutions: PreparedMigrationExecutionSet[];
    };

export type ResolvePreparedMigrationV3Input = {
  oldPubkey: Hex32;
  events: NostrEvent[];
  proofs: OtsProofSummary[];
};

export async function buildPmaV3(input: {
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

  const event = await input.oldSigner.signEvent({
    pubkey: oldPubkey,
    created_at: input.createdAt ?? Math.floor(Date.now() / 1000),
    kind: PMA_KIND_V3,
    tags: [
      ["o", oldPubkey],
      ["m", input.migrationPubkey],
      ["t", "root"],
      ["alt", PMA_ALT_V3],
    ],
    content: "",
  });

  assertSignedEventShape(event, {
    expectedPubkey: oldPubkey,
    expectedKind: PMA_KIND_V3,
    expectedContent: "",
    label: "PMA v3",
  });

  return event;
}

export async function buildPmuV3(input: {
  oldPubkey: Hex32;
  rootAuthorityId: EventId;
  previousAuthorityId: EventId;
  currentMigrationSigner: SignerLike;
  nextMigrationPubkey: Hex32;
  oldDetachedSigner: DetachedSignerLike;
  nextDetachedSigner: DetachedSignerLike;
  createdAt?: number;
}): Promise<NostrEvent> {
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");
  assertEventId(input.rootAuthorityId, "rootAuthorityId");
  assertEventId(input.previousAuthorityId, "previousAuthorityId");
  assertLowercaseHex32(input.nextMigrationPubkey, "nextMigrationPubkey");

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

  if (oldDetachedPubkey !== input.oldPubkey) {
    throw new ProtocolError("oldDetachedSigner pubkey does not match oldPubkey");
  }

  if (nextDetachedPubkey !== input.nextMigrationPubkey) {
    throw new ProtocolError("nextDetachedSigner pubkey does not match nextMigrationPubkey");
  }

  const createdAt = input.createdAt ?? Math.floor(Date.now() / 1000);
  const detachedDigest = computePmuDetachedSignDigestV3Sync({
    oldPubkey: input.oldPubkey,
    rootAuthorityId: input.rootAuthorityId,
    previousAuthorityId: input.previousAuthorityId,
    currentMigrationPubkey,
    nextMigrationPubkey: input.nextMigrationPubkey,
    createdAt,
  });

  const oldSignature = await input.oldDetachedSigner.signDigest(detachedDigest);
  const nextSignature = await input.nextDetachedSigner.signDigest(detachedDigest);

  assertSignatureHex(oldSignature, "oldDetachedSignature");
  assertSignatureHex(nextSignature, "nextDetachedSignature");

  const event = await input.currentMigrationSigner.signEvent({
    pubkey: currentMigrationPubkey,
    created_at: createdAt,
    kind: PMU_KIND_V3,
    tags: [
      ["o", input.oldPubkey],
      ["E", input.rootAuthorityId],
      ["e", input.previousAuthorityId],
      ["u", input.nextMigrationPubkey],
      ["os", oldSignature],
      ["ns", nextSignature],
      ["alt", PMU_ALT_V3],
    ],
    content: "",
  });

  assertSignedEventShape(event, {
    expectedPubkey: currentMigrationPubkey,
    expectedKind: PMU_KIND_V3,
    expectedContent: "",
    label: "PMU v3",
  });

  return event;
}

export async function buildPmxV3(input: {
  rootAuthorityId: EventId;
  authorityId: EventId;
  oldPubkey: Hex32;
  migrationSigner: SignerLike;
  newSigner: SignerLike;
  createdAt?: number;
}): Promise<NostrEvent> {
  assertEventId(input.rootAuthorityId, "rootAuthorityId");
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
  const transitionId = computeTransitionIdSync(input.oldPubkey, newPubkey);
  const detachedDigest = computePmxDetachedSignDigestV3Sync({
    transitionId,
    rootAuthorityId: input.rootAuthorityId,
    activeAuthorityId: input.authorityId,
    oldPubkey: input.oldPubkey,
    newPubkey,
    createdAt,
  });
  const successorSignature = await signWithSignerDigest(input.newSigner, detachedDigest);

  const event = await input.migrationSigner.signEvent({
    pubkey: migrationPubkey,
    created_at: createdAt,
    kind: PMX_KIND_V3,
    tags: [
      ["d", transitionId],
      ["o", input.oldPubkey],
      ["n", newPubkey],
      ["E", input.rootAuthorityId],
      ["e", input.authorityId],
      ["ns", successorSignature],
      ["alt", PMX_ALT_V3],
    ],
    content: "",
  });

  assertSignedEventShape(event, {
    expectedPubkey: migrationPubkey,
    expectedKind: PMX_KIND_V3,
    expectedContent: "",
    label: "PMX v3",
  });

  return event;
}

export async function computePmuDetachedSignDigestV3(input: {
  oldPubkey: Hex32;
  rootAuthorityId: EventId;
  previousAuthorityId: EventId;
  currentMigrationPubkey: Hex32;
  nextMigrationPubkey: Hex32;
  createdAt: number;
}): Promise<string> {
  return computePmuDetachedSignDigestV3Sync(input);
}

export async function computePmxDetachedSignDigestV3(input: {
  transitionId: string;
  rootAuthorityId: EventId;
  activeAuthorityId: EventId;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  createdAt: number;
}): Promise<string> {
  return computePmxDetachedSignDigestV3Sync(input);
}

export function summarizeLegacyOtsProofs(otsProofs: NostrEvent[]): OtsProofSummary[] {
  return otsProofs.map((event) => {
    const proofEventId = isLowercaseHexOfLength(event.id ?? "", EVENT_ID_HEX_LENGTH) ? event.id : undefined;

    if (event.kind !== OTS_KIND_V3) {
      return { ok: false, proofEventId, code: "wrong_kind", reason: "OTS proof kind must be 1040" };
    }

    if (!proofEventId) {
      return { ok: false, code: "invalid_id", reason: "OTS proof event id must be 32-byte lowercase hex" };
    }

    if (event.content.length === 0) {
      return {
        ok: false,
        proofEventId,
        code: "empty_content",
        reason: "OTS proof event content must contain proof bytes",
      };
    }

    const targetEventId = getSingleTagValue(event, "e");
    const targetKindText = getSingleTagValue(event, "k");
    if (!targetEventId || !isLowercaseHexOfLength(targetEventId, EVENT_ID_HEX_LENGTH)) {
      return {
        ok: false,
        proofEventId,
        code: "invalid_target_event",
        reason: "OTS proof must contain exactly one lowercase-hex e tag",
      };
    }

    const targetKind = parsePositiveInteger(targetKindText);
    if (targetKind === undefined) {
      return {
        ok: false,
        proofEventId,
        code: "invalid_target_kind",
        reason: "OTS proof must contain exactly one positive-integer k tag",
      };
    }

    const anchorHeight = parsePositiveInteger(getSingleTagValue(event, LEGACY_VERIFIED_ANCHOR_HEIGHT_TAG));
    if (anchorHeight === undefined) {
      return {
        ok: true,
        proofEventId,
        targetEventId,
        targetKind,
        status: "pending",
      };
    }

    return {
      ok: true,
      proofEventId,
      targetEventId,
      targetKind,
      status: "bitcoin_confirmed",
      anchorHeight,
    };
  });
}

export function validatePmaV3(event: NostrEvent, proofs: OtsProofSummary[]): ValidatedPmaV3 | InvalidV3 {
  const fields = validatePmaFieldsV3(event);
  if (!fields.ok) {
    return fields;
  }

  const assessment = assessConfirmedProofs(fields.authorityId, PMA_KIND_V3, proofs);
  if (!assessment.ok) {
    return assessment;
  }

  return {
    ok: true,
    kind: "pma",
    authorityId: fields.authorityId,
    oldPubkey: fields.oldPubkey,
    migrationPubkey: fields.migrationPubkey,
    anchorHeight: assessment.anchorHeight,
    proofEventIds: assessment.proofEventIds,
    event,
  };
}

export function validatePmuV3(
  event: NostrEvent,
  input: {
    root: PreparedMigrationRootGroup;
    currentAuthority: PreparedMigrationAuthoritySet;
    proofs: OtsProofSummary[];
  },
): ValidatedPmuV3 | InvalidV3 {
  const fields = validatePmuFieldsV3(event);
  if (!fields.ok) {
    return fields;
  }

  if (fields.rootAuthorityId !== input.root.canonicalAuthorityId && !input.root.authorityIds.includes(fields.rootAuthorityId)) {
    return invalid("root_reference_mismatch", "PMU E tag must reference the active root group", fields.authorityId);
  }

  if (!input.currentAuthority.authorityIds.includes(fields.previousAuthorityId)) {
    return invalid(
      "previous_authority_mismatch",
      "PMU e tag must reference the current authority set",
      fields.authorityId,
    );
  }

  if (fields.oldPubkey !== input.root.oldPubkey) {
    return invalid("old_pubkey_mismatch", "PMU old pubkey must match the root group", fields.authorityId);
  }

  if (fields.currentMigrationPubkey !== input.currentAuthority.migrationPubkey) {
    return invalid(
      "current_migration_mismatch",
      "PMU pubkey must equal the current authority migration key",
      fields.authorityId,
    );
  }

  const detachedDigest = computePmuDetachedSignDigestV3Sync({
    oldPubkey: fields.oldPubkey,
    rootAuthorityId: fields.rootAuthorityId,
    previousAuthorityId: fields.previousAuthorityId,
    currentMigrationPubkey: fields.currentMigrationPubkey,
    nextMigrationPubkey: fields.nextMigrationPubkey,
    createdAt: event.created_at,
  });

  if (
    !verifySchnorrDigestSignature({
      messageHashHex: detachedDigest,
      signatureHex: fields.oldDetachedSignature,
      pubkeyHex: fields.oldPubkey,
    })
  ) {
    return invalid("invalid_os_sig", "PMU os tag must verify under the old key", fields.authorityId);
  }

  if (
    !verifySchnorrDigestSignature({
      messageHashHex: detachedDigest,
      signatureHex: fields.nextDetachedSignature,
      pubkeyHex: fields.nextMigrationPubkey,
    })
  ) {
    return invalid("invalid_ns_sig", "PMU ns tag must verify under the next migration key", fields.authorityId);
  }

  const assessment = assessConfirmedProofs(fields.authorityId, PMU_KIND_V3, input.proofs);
  if (!assessment.ok) {
    return assessment;
  }

  return {
    ok: true,
    kind: "pmu",
    authorityId: fields.authorityId,
    rootAuthorityId: fields.rootAuthorityId,
    previousAuthorityId: fields.previousAuthorityId,
    oldPubkey: fields.oldPubkey,
    currentMigrationPubkey: fields.currentMigrationPubkey,
    nextMigrationPubkey: fields.nextMigrationPubkey,
    anchorHeight: assessment.anchorHeight,
    proofEventIds: assessment.proofEventIds,
    event,
  };
}

export function validatePmxV3(
  event: NostrEvent,
  input: {
    root: PreparedMigrationRootGroup;
    activeAuthority: PreparedMigrationAuthoritySet;
  },
): ValidatedPmxV3 | InvalidV3 {
  const fields = validatePmxFieldsV3(event);
  if (!fields.ok) {
    return fields;
  }

  if (fields.oldPubkey !== input.root.oldPubkey) {
    return invalid("old_pubkey_mismatch", "PMX old pubkey must match the root group", fields.executionId);
  }

  if (!input.root.authorityIds.includes(fields.rootAuthorityId)) {
    return invalid("root_reference_mismatch", "PMX E tag must reference the active root group", fields.executionId);
  }

  if (!input.activeAuthority.authorityIds.includes(fields.activeAuthorityId)) {
    return invalid(
      "stale_authority_reference",
      "PMX e tag must reference the active authority set",
      fields.executionId,
    );
  }

  if (fields.migrationPubkey !== input.activeAuthority.migrationPubkey) {
    return invalid(
      "current_migration_mismatch",
      "PMX pubkey must equal the active migration key",
      fields.executionId,
    );
  }

  const detachedDigest = computePmxDetachedSignDigestV3Sync({
    transitionId: fields.transitionId,
    rootAuthorityId: fields.rootAuthorityId,
    activeAuthorityId: fields.activeAuthorityId,
    oldPubkey: fields.oldPubkey,
    newPubkey: fields.newPubkey,
    createdAt: event.created_at,
  });

  if (
    !verifySchnorrDigestSignature({
      messageHashHex: detachedDigest,
      signatureHex: fields.successorSignature,
      pubkeyHex: fields.newPubkey,
    })
  ) {
    return invalid("invalid_ns_sig", "PMX ns tag must verify under the successor key", fields.executionId);
  }

  return {
    ok: true,
    kind: "pmx",
    executionId: fields.executionId,
    transitionId: fields.transitionId,
    rootAuthorityId: fields.rootAuthorityId,
    activeAuthorityId: fields.activeAuthorityId,
    oldPubkey: fields.oldPubkey,
    migrationPubkey: fields.migrationPubkey,
    newPubkey: fields.newPubkey,
    event,
  };
}

export function resolvePreparedMigrationV3(
  input: ResolvePreparedMigrationV3Input,
): PreparedMigrationV3State {
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");

  const validatedRoots = input.events
    .filter((event) => event.kind === PMA_KIND_V3 && event.pubkey === input.oldPubkey)
    .map((event) => validatePmaV3(event, input.proofs))
    .filter((entry): entry is ValidatedPmaV3 => entry.ok);

  if (validatedRoots.length === 0) {
    return { state: "none" };
  }

  const rootGroups = groupRoots(validatedRoots);
  const earliestAnchorHeight = Math.min(...rootGroups.map((entry) => entry.anchorHeight));
  const earliestRoots = rootGroups.filter((entry) => entry.anchorHeight === earliestAnchorHeight);

  if (earliestRoots.length > 1) {
    return {
      state: "conflicting_roots",
      anchorHeight: earliestAnchorHeight,
      roots: earliestRoots,
    };
  }

  const root = earliestRoots[0];
  let activeAuthority: PreparedMigrationAuthoritySet = {
    canonicalAuthorityId: root.canonicalAuthorityId,
    authorityIds: [...root.authorityIds],
    rootAuthorityCanonicalId: root.canonicalAuthorityId,
    oldPubkey: root.oldPubkey,
    migrationPubkey: root.migrationPubkey,
    anchorHeight: root.anchorHeight,
  };

  while (true) {
    const candidateChildren = input.events
      .filter((event) => event.kind === PMU_KIND_V3)
      .filter((event) => getSingleTagValue(event, "o") === input.oldPubkey)
      .filter((event) => event.pubkey === activeAuthority.migrationPubkey)
      .filter((event) => {
        const rootId = getSingleTagValue(event, "E");
        const parentId = getSingleTagValue(event, "e");
        return rootId !== undefined && parentId !== undefined && root.authorityIds.includes(rootId) && activeAuthority.authorityIds.includes(parentId);
      })
      .map((event) => validatePmuV3(event, { root, currentAuthority: activeAuthority, proofs: input.proofs }))
      .filter((entry): entry is ValidatedPmuV3 => entry.ok);

    const groupedChildren = groupAuthorityUpdates(root, candidateChildren);

    if (groupedChildren.length === 0) {
      break;
    }

    if (groupedChildren.length > 1) {
      return {
        state: "conflicting_authority_updates",
        root,
        activeAuthority,
        conflictingAuthorities: groupedChildren,
      };
    }

    activeAuthority = groupedChildren[0];
  }

  const candidateExecutions = input.events
    .filter((event) => event.kind === PMX_KIND_V3)
    .filter((event) => getSingleTagValue(event, "o") === input.oldPubkey)
    .filter((event) => event.pubkey === activeAuthority.migrationPubkey)
    .filter((event) => {
      const rootId = getSingleTagValue(event, "E");
      const authorityId = getSingleTagValue(event, "e");
      return rootId !== undefined && authorityId !== undefined && root.authorityIds.includes(rootId) && activeAuthority.authorityIds.includes(authorityId);
    })
    .map((event) => validatePmxV3(event, { root, activeAuthority }))
    .filter((entry): entry is ValidatedPmxV3 => entry.ok);

  const groupedExecutions = groupExecutions(candidateExecutions);

  if (groupedExecutions.length === 0) {
    return {
      state: "prepared_enrolled",
      root,
      activeAuthority,
    };
  }

  if (groupedExecutions.length > 1) {
    return {
      state: "conflicting_executions",
      root,
      activeAuthority,
      conflictingExecutions: groupedExecutions,
    };
  }

  return {
    state: "prepared_migrated",
    root,
    activeAuthority,
    execution: groupedExecutions[0],
    newPubkey: groupedExecutions[0].newPubkey,
  };
}

type ValidatedPmaFieldsV3 = {
  ok: true;
  authorityId: EventId;
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
} | InvalidV3;

type ValidatedPmuFieldsV3 = {
  ok: true;
  authorityId: EventId;
  rootAuthorityId: EventId;
  previousAuthorityId: EventId;
  oldPubkey: Hex32;
  currentMigrationPubkey: Hex32;
  nextMigrationPubkey: Hex32;
  oldDetachedSignature: string;
  nextDetachedSignature: string;
} | InvalidV3;

type ValidatedPmxFieldsV3 = {
  ok: true;
  executionId: EventId;
  transitionId: string;
  rootAuthorityId: EventId;
  activeAuthorityId: EventId;
  oldPubkey: Hex32;
  migrationPubkey: Hex32;
  newPubkey: Hex32;
  successorSignature: string;
} | InvalidV3;

function validatePmaFieldsV3(event: NostrEvent): ValidatedPmaFieldsV3 {
  if (event.kind !== PMA_KIND_V3) {
    return invalid("wrong_kind", "PMA kind must be 1776");
  }

  if (event.content !== "") {
    return invalid("non_empty_content", "PMA content must be empty");
  }

  const oValues = getTagValues(event, "o");
  const mValues = getTagValues(event, "m");
  const tValues = getTagValues(event, "t");
  if (oValues.length !== 1) {
    return invalid("invalid_o_tag", "PMA must contain exactly one o tag");
  }
  if (mValues.length !== 1) {
    return invalid("invalid_m_tag", "PMA must contain exactly one m tag");
  }
  if (tValues.length !== 1 || tValues[0] !== "root") {
    return invalid("invalid_t_tag", 'PMA must contain exactly one t tag with value "root"');
  }
  if (getTagValues(event, "e").length > 0 || getTagValues(event, "E").length > 0) {
    return invalid("unexpected_lineage_tag", "PMA must not contain e or E tags");
  }

  try {
    assertLowercaseHex32(event.pubkey, "event.pubkey");
    assertLowercaseHex32(oValues[0], "o");
    assertLowercaseHex32(mValues[0], "m");
  } catch (error) {
    return invalid("invalid_pubkey", getErrorMessage(error));
  }

  if (event.pubkey !== oValues[0]) {
    return invalid("old_pubkey_mismatch", "PMA o tag must equal the event pubkey");
  }

  if (oValues[0] === mValues[0]) {
    return invalid("self_migration_key", "PMA migration pubkey must differ from the old pubkey");
  }

  const envelope = validateSignedEventEnvelope(event, "PMA");
  if (!envelope.ok) {
    return envelope;
  }

  return {
    ok: true,
    authorityId: envelope.eventId,
    oldPubkey: oValues[0],
    migrationPubkey: mValues[0],
  };
}

function validatePmuFieldsV3(event: NostrEvent): ValidatedPmuFieldsV3 {
  if (event.kind !== PMU_KIND_V3) {
    return invalid("wrong_kind", "PMU kind must be 1779");
  }
  if (event.content !== "") {
    return invalid("non_empty_content", "PMU content must be empty");
  }

  const oValues = getTagValues(event, "o");
  const rootValues = getTagValues(event, "E");
  const parentValues = getTagValues(event, "e");
  const uValues = getTagValues(event, "u");
  const osValues = getTagValues(event, "os");
  const nsValues = getTagValues(event, "ns");

  if (oValues.length !== 1 || rootValues.length !== 1 || parentValues.length !== 1 || uValues.length !== 1 || osValues.length !== 1 || nsValues.length !== 1) {
    return invalid("invalid_tags", "PMU must contain exactly one of o, E, e, u, os, and ns tags");
  }

  try {
    assertLowercaseHex32(event.pubkey, "event.pubkey");
    assertLowercaseHex32(oValues[0], "o");
    assertEventId(rootValues[0], "E");
    assertEventId(parentValues[0], "e");
    assertLowercaseHex32(uValues[0], "u");
    assertSignatureHex(osValues[0], "os");
    assertSignatureHex(nsValues[0], "ns");
  } catch (error) {
    return invalid("invalid_pmu_tag", getErrorMessage(error));
  }

  if (uValues[0] === oValues[0]) {
    return invalid("self_migration_key", "PMU next migration pubkey must differ from the old pubkey");
  }

  if (uValues[0] === event.pubkey) {
    return invalid("same_current_and_next_key", "PMU next migration pubkey must differ from the event pubkey");
  }

  const envelope = validateSignedEventEnvelope(event, "PMU");
  if (!envelope.ok) {
    return envelope;
  }

  return {
    ok: true,
    authorityId: envelope.eventId,
    rootAuthorityId: rootValues[0],
    previousAuthorityId: parentValues[0],
    oldPubkey: oValues[0],
    currentMigrationPubkey: event.pubkey,
    nextMigrationPubkey: uValues[0],
    oldDetachedSignature: osValues[0],
    nextDetachedSignature: nsValues[0],
  };
}

function validatePmxFieldsV3(event: NostrEvent): ValidatedPmxFieldsV3 {
  if (event.kind !== PMX_KIND_V3) {
    return invalid("wrong_kind", "PMX kind must be 1777");
  }
  if (event.content !== "") {
    return invalid("non_empty_content", "PMX content must be empty");
  }

  const dValues = getTagValues(event, "d");
  const oValues = getTagValues(event, "o");
  const nValues = getTagValues(event, "n");
  const rootValues = getTagValues(event, "E");
  const authorityValues = getTagValues(event, "e");
  const nsValues = getTagValues(event, "ns");

  if (dValues.length !== 1 || oValues.length !== 1 || nValues.length !== 1 || rootValues.length !== 1 || authorityValues.length !== 1 || nsValues.length !== 1) {
    return invalid("invalid_tags", "PMX must contain exactly one of d, o, n, E, e, and ns tags");
  }

  try {
    assertLowercaseHex32(event.pubkey, "event.pubkey");
    assertLowercaseHex32(oValues[0], "o");
    assertLowercaseHex32(nValues[0], "n");
    assertEventId(rootValues[0], "E");
    assertEventId(authorityValues[0], "e");
    assertSignatureHex(nsValues[0], "ns");
  } catch (error) {
    return invalid("invalid_pmx_tag", getErrorMessage(error));
  }

  if (oValues[0] === nValues[0]) {
    return invalid("same_old_and_new_key", "PMX new pubkey must differ from the old pubkey");
  }

  const expectedTransitionId = computeTransitionIdSync(oValues[0], nValues[0]);
  if (dValues[0] !== expectedTransitionId) {
    return invalid("transition_id_mismatch", "PMX d tag must match the computed transition id");
  }

  const envelope = validateSignedEventEnvelope(event, "PMX");
  if (!envelope.ok) {
    return envelope;
  }

  return {
    ok: true,
    executionId: envelope.eventId,
    transitionId: dValues[0],
    rootAuthorityId: rootValues[0],
    activeAuthorityId: authorityValues[0],
    oldPubkey: oValues[0],
    migrationPubkey: event.pubkey,
    newPubkey: nValues[0],
    successorSignature: nsValues[0],
  };
}

function groupRoots(validatedRoots: ValidatedPmaV3[]): PreparedMigrationRootGroup[] {
  const groups = new Map<string, ValidatedPmaV3[]>();

  for (const root of validatedRoots) {
    const key = `${root.oldPubkey}:${root.migrationPubkey}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(root);
    } else {
      groups.set(key, [root]);
    }
  }

  return [...groups.values()].map((members) => {
    const anchorHeight = Math.min(...members.map((entry) => entry.anchorHeight));
    const canonicalAuthorityId = [...members]
      .filter((entry) => entry.anchorHeight === anchorHeight)
      .map((entry) => entry.authorityId)
      .sort()[0]!;

    return {
      canonicalAuthorityId,
      authorityIds: members.map((entry) => entry.authorityId).sort(),
      oldPubkey: members[0]!.oldPubkey,
      migrationPubkey: members[0]!.migrationPubkey,
      anchorHeight,
    };
  });
}

function groupAuthorityUpdates(
  root: PreparedMigrationRootGroup,
  validatedChildren: ValidatedPmuV3[],
): PreparedMigrationAuthoritySet[] {
  const groups = new Map<string, ValidatedPmuV3[]>();

  for (const child of validatedChildren) {
    const existing = groups.get(child.nextMigrationPubkey);
    if (existing) {
      existing.push(child);
    } else {
      groups.set(child.nextMigrationPubkey, [child]);
    }
  }

  return [...groups.values()].map((members) => {
    const anchorHeight = Math.min(...members.map((entry) => entry.anchorHeight));
    const canonicalAuthorityId = [...members]
      .filter((entry) => entry.anchorHeight === anchorHeight)
      .map((entry) => entry.authorityId)
      .sort()[0]!;

    return {
      canonicalAuthorityId,
      authorityIds: members.map((entry) => entry.authorityId).sort(),
      rootAuthorityCanonicalId: root.canonicalAuthorityId,
      oldPubkey: members[0]!.oldPubkey,
      migrationPubkey: members[0]!.nextMigrationPubkey,
      anchorHeight,
    };
  });
}

function groupExecutions(validatedExecutions: ValidatedPmxV3[]): PreparedMigrationExecutionSet[] {
  const groups = new Map<string, ValidatedPmxV3[]>();

  for (const execution of validatedExecutions) {
    const existing = groups.get(execution.newPubkey);
    if (existing) {
      existing.push(execution);
    } else {
      groups.set(execution.newPubkey, [execution]);
    }
  }

  return [...groups.values()].map((members) => ({
    canonicalExecutionId: members.map((entry) => entry.executionId).sort()[0]!,
    executionIds: members.map((entry) => entry.executionId).sort(),
    newPubkey: members[0]!.newPubkey,
  }));
}

function assessConfirmedProofs(
  targetEventId: EventId,
  targetKind: number,
  proofs: OtsProofSummary[],
): { ok: true; anchorHeight: number; proofEventIds: EventId[] } | InvalidV3 {
  const matchingProofs = proofs.filter(
    (proof): proof is Extract<OtsProofSummary, { ok: true }> =>
      proof.ok && proof.targetEventId === targetEventId && proof.targetKind === targetKind,
  );

  if (matchingProofs.length === 0) {
    return invalid("missing_ots", "authority has no matching 1040 proof event", targetEventId);
  }

  const confirmedProofs = matchingProofs.filter(
    (proof): proof is Extract<OtsProofSummary, { ok: true; status: "bitcoin_confirmed" }> =>
      proof.status === "bitcoin_confirmed",
  );

  if (confirmedProofs.length === 0) {
    return invalid(
      "pending_ots",
      "authority has matching 1040 proof events but none are Bitcoin-confirmed",
      targetEventId,
      matchingProofs.flatMap((proof) => (proof.proofEventId ? [proof.proofEventId] : [])),
    );
  }

  return {
    ok: true,
    anchorHeight: Math.min(...confirmedProofs.map((proof) => proof.anchorHeight)),
    proofEventIds: confirmedProofs.flatMap((proof) => (proof.proofEventId ? [proof.proofEventId] : [])),
  };
}

function computePmuDetachedSignDigestV3Sync(input: {
  oldPubkey: Hex32;
  rootAuthorityId: EventId;
  previousAuthorityId: EventId;
  currentMigrationPubkey: Hex32;
  nextMigrationPubkey: Hex32;
  createdAt: number;
}): string {
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");
  assertEventId(input.rootAuthorityId, "rootAuthorityId");
  assertEventId(input.previousAuthorityId, "previousAuthorityId");
  assertLowercaseHex32(input.currentMigrationPubkey, "currentMigrationPubkey");
  assertLowercaseHex32(input.nextMigrationPubkey, "nextMigrationPubkey");

  return sha256HexSync(
    canonicalJsonArray([
      "NIP-XX",
      "prepared-migration-update",
      2,
      input.oldPubkey,
      input.rootAuthorityId,
      input.previousAuthorityId,
      input.currentMigrationPubkey,
      input.nextMigrationPubkey,
      input.createdAt,
    ]),
  );
}

function computePmxDetachedSignDigestV3Sync(input: {
  transitionId: string;
  rootAuthorityId: EventId;
  activeAuthorityId: EventId;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  createdAt: number;
}): string {
  assertLowercaseHex32(input.transitionId, "transitionId");
  assertEventId(input.rootAuthorityId, "rootAuthorityId");
  assertEventId(input.activeAuthorityId, "activeAuthorityId");
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");
  assertLowercaseHex32(input.newPubkey, "newPubkey");

  return sha256HexSync(
    canonicalJsonArray([
      "NIP-XX",
      "prepared-migration-execution",
      2,
      input.transitionId,
      input.rootAuthorityId,
      input.activeAuthorityId,
      input.oldPubkey,
      input.newPubkey,
      input.createdAt,
    ]),
  );
}

function validateSignedEventEnvelope(
  event: NostrEvent,
  label: string,
): { ok: true; eventId: EventId } | InvalidV3 {
  if (!event.id || !isLowercaseHexOfLength(event.id, EVENT_ID_HEX_LENGTH)) {
    return invalid("invalid_id", `${label} event id must be 32-byte lowercase hex`);
  }

  if (!event.sig || !isLowercaseHexOfLength(event.sig, SIGNATURE_HEX_LENGTH)) {
    return invalid("invalid_sig", `${label} event signature must be 64-byte lowercase hex`);
  }

  if (!verifyNostrEventSignature(event)) {
    return invalid("invalid_sig", `${label} event signature must pass Schnorr verification`);
  }

  return { ok: true, eventId: event.id };
}

function invalid(code: string, reason: string, eventId?: EventId, proofEventIds?: EventId[]): InvalidV3 {
  return { ok: false, code, reason, eventId, proofEventIds };
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

function isLowercaseHexOfLength(value: string, length: number): boolean {
  return value.length === length && HEX_PATTERN.test(value);
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^[1-9][0-9]*$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
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

  if (!event.id || !event.sig || !verifyNostrEventSignature(event)) {
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

function computeTransitionIdSync(oldPubkey: Hex32, newPubkey: Hex32): string {
  assertLowercaseHex32(oldPubkey, "oldPubkey");
  assertLowercaseHex32(newPubkey, "newPubkey");

  const prefix = utf8("nostr-social-transition:v1");
  const oldBytes = hexToBytes(oldPubkey);
  const newBytes = hexToBytes(newPubkey);
  const bytes = new Uint8Array(prefix.length + oldBytes.length + newBytes.length + 2);
  let offset = 0;
  bytes.set(prefix, offset);
  offset += prefix.length;
  bytes[offset] = 0x00;
  offset += 1;
  bytes.set(oldBytes, offset);
  offset += oldBytes.length;
  bytes[offset] = 0x00;
  offset += 1;
  bytes.set(newBytes, offset);
  return sha256HexSync(bytes);
}
