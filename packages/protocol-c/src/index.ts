import {
  ProtocolError,
  assertLowercaseHex32,
  computeTransitionId,
  getSingleTagValue,
  getTagValues,
  verifyNostrEventSignature,
  type EventId,
  type Hex32,
  type NostrEvent,
} from "@tack/protocol-shared";
import type { SignerLike, UnsignedNostrEvent } from "../../protocol-a/src/index";

export const PROTOCOL_C_EVENT_KINDS = [1778, 31778] as const;

export const STC_KIND = 1778;
export const STA_KIND = 31778;

const STC_ALT = "Social Transition Claim";
const STA_ALT = "Social Transition Attestation";
const STANCE_VALUES = new Set(["support", "oppose", "uncertain"]);
const METHOD_VALUES = new Set(["in_person", "video", "voice", "website", "nip05", "chat", "other"]);
const EVENT_ID_HEX_LENGTH = 64;
const SIGNATURE_HEX_LENGTH = 128;
const HEX_PATTERN = /^[0-9a-f]+$/;

export type SocialTransitionState =
  | { state: "none" }
  | {
      state: "claimed";
      oldPubkey: Hex32;
      newPubkey: Hex32;
      claimIds: EventId[];
      claimRoles: Array<"old" | "new">;
      selfAssertedSupportPubkeys: Hex32[];
      selfAssertedOpposePubkeys: Hex32[];
    }
  | {
      state: "socially_supported";
      oldPubkey: Hex32;
      newPubkey: Hex32;
      claimIds: EventId[];
      claimRoles: Array<"old" | "new">;
      supportPubkeys: Hex32[];
      selfAssertedSupportPubkeys: Hex32[];
      selfAssertedOpposePubkeys: Hex32[];
    }
  | {
      state: "socially_opposed";
      oldPubkey: Hex32;
      newPubkey: Hex32;
      claimIds: EventId[];
      claimRoles: Array<"old" | "new">;
      opposePubkeys: Hex32[];
      selfAssertedSupportPubkeys: Hex32[];
      selfAssertedOpposePubkeys: Hex32[];
    }
  | {
      state: "socially_split";
      oldPubkey: Hex32;
      newPubkey: Hex32;
      claimIds: EventId[];
      claimRoles: Array<"old" | "new">;
      supportPubkeys: Hex32[];
      opposePubkeys: Hex32[];
      selfAssertedSupportPubkeys: Hex32[];
      selfAssertedOpposePubkeys: Hex32[];
    };

export type ResolveSocialTransitionInput = {
  viewerFollowSet: Set<Hex32>;
  viewerTrustedSet?: Set<Hex32>;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  claims: NostrEvent[];
  attestations: NostrEvent[];
};

export type Invalid = {
  ok: false;
  code: string;
  reason: string;
  eventId?: EventId;
};

export type ValidatedClaim = {
  ok: true;
  kind: "stc";
  claimId: EventId;
  transitionId: string;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  role: "old" | "new";
  signatureStatus: "verified";
  event: NostrEvent;
};

export type ValidatedAttestation = {
  ok: true;
  kind: "sta";
  attestationId: EventId;
  transitionId: string;
  oldPubkey: Hex32;
  newPubkey: Hex32;
  attestorPubkey: Hex32;
  stance: "support" | "oppose" | "uncertain";
  method?: string;
  referencedClaimIds: EventId[];
  signatureStatus: "verified";
  event: NostrEvent;
};

export async function buildSocialClaim(input: {
  role?: "old" | "new";
  oldPubkey: Hex32;
  newPubkey: Hex32;
  signer: SignerLike;
  content?: string;
  createdAt?: number;
}): Promise<NostrEvent> {
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");
  assertLowercaseHex32(input.newPubkey, "newPubkey");

  if (input.oldPubkey === input.newPubkey) {
    throw new ProtocolError("newPubkey must not equal oldPubkey");
  }

  const signerPubkey = await input.signer.getPublicKey();
  assertLowercaseHex32(signerPubkey, "signerPubkey");

  if (signerPubkey !== input.oldPubkey && signerPubkey !== input.newPubkey) {
    throw new ProtocolError("social claim signer must equal oldPubkey or newPubkey");
  }

  if (input.role === "old" && signerPubkey !== input.oldPubkey) {
    throw new ProtocolError("old-role claim signer must equal oldPubkey");
  }

  if (input.role === "new" && signerPubkey !== input.newPubkey) {
    throw new ProtocolError("new-role claim signer must equal newPubkey");
  }

  const transitionId = await computeTransitionId(input.oldPubkey, input.newPubkey);
  const unsignedEvent: UnsignedNostrEvent = {
    pubkey: signerPubkey,
    created_at: input.createdAt ?? Math.floor(Date.now() / 1000),
    kind: STC_KIND,
    tags: [
      ["d", transitionId],
      ["o", input.oldPubkey],
      ["n", input.newPubkey],
      ["alt", STC_ALT],
    ],
    content: input.content ?? "",
  };

  const event = await input.signer.signEvent(unsignedEvent);

  assertSignedEventShape(event, {
    expectedPubkey: signerPubkey,
    expectedKind: STC_KIND,
    label: "STC",
  });

  return event;
}

export async function buildSocialAttestation(input: {
  oldPubkey: Hex32;
  newPubkey: Hex32;
  attestorSigner: SignerLike;
  stance: "support" | "oppose" | "uncertain";
  method?: "in_person" | "video" | "voice" | "website" | "nip05" | "chat" | "other";
  content?: string;
  referencedClaimIds?: EventId[];
  createdAt?: number;
}): Promise<NostrEvent> {
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");
  assertLowercaseHex32(input.newPubkey, "newPubkey");

  if (input.oldPubkey === input.newPubkey) {
    throw new ProtocolError("newPubkey must not equal oldPubkey");
  }

  if (!STANCE_VALUES.has(input.stance)) {
    throw new ProtocolError("stance must be support, oppose, or uncertain");
  }

  if (input.method && !METHOD_VALUES.has(input.method)) {
    throw new ProtocolError("method must be one of the supported verification methods");
  }

  for (const claimId of input.referencedClaimIds ?? []) {
    assertEventId(claimId, "referencedClaimId");
  }

  const attestorPubkey = await input.attestorSigner.getPublicKey();
  assertLowercaseHex32(attestorPubkey, "attestorPubkey");

  const transitionId = await computeTransitionId(input.oldPubkey, input.newPubkey);
  const unsignedEvent: UnsignedNostrEvent = {
    pubkey: attestorPubkey,
    created_at: input.createdAt ?? Math.floor(Date.now() / 1000),
    kind: STA_KIND,
    tags: [
      ["d", transitionId],
      ["o", input.oldPubkey],
      ["n", input.newPubkey],
      ["s", input.stance],
      ...(input.method ? [["m", input.method]] : []),
      ...((input.referencedClaimIds ?? []).map((claimId) => ["e", claimId] as string[])),
      ["alt", STA_ALT],
    ],
    content: input.content ?? "",
  };

  const event = await input.attestorSigner.signEvent(unsignedEvent);

  assertSignedEventShape(event, {
    expectedPubkey: attestorPubkey,
    expectedKind: STA_KIND,
    label: "STA",
  });

  return event;
}

export async function validateSocialClaim(event: NostrEvent): Promise<ValidatedClaim | Invalid> {
  if (event.kind !== STC_KIND) {
    return invalid("wrong_kind", "STC kind must be 1778");
  }

  const tags = await extractCoreTransitionTags(event, "STC");
  if (!tags.ok) {
    return tags;
  }

  if (getTagValues(event, "r").length > 0) {
    return invalid("unexpected_r_tag", "STC must not contain an r tag");
  }

  const role = event.pubkey === tags.oldPubkey ? "old" : event.pubkey === tags.newPubkey ? "new" : undefined;
  if (!role) {
    return invalid("role_pubkey_mismatch", "STC pubkey must equal oldPubkey or newPubkey");
  }

  return {
    ok: true,
    kind: "stc",
    claimId: tags.eventId,
    transitionId: tags.transitionId,
    oldPubkey: tags.oldPubkey,
    newPubkey: tags.newPubkey,
    role,
    signatureStatus: "verified",
    event,
  };
}

export async function validateSocialAttestation(
  event: NostrEvent,
): Promise<ValidatedAttestation | Invalid> {
  if (event.kind !== STA_KIND) {
    return invalid("wrong_kind", "STA kind must be 31778");
  }

  const tags = await extractCoreTransitionTags(event, "STA");
  if (!tags.ok) {
    return tags;
  }

  const stanceValues = getTagValues(event, "s");
  if (stanceValues.length !== 1) {
    return invalid("invalid_s_tag", "STA must contain exactly one s tag");
  }

  const stance = stanceValues[0];
  if (stance !== "support" && stance !== "oppose" && stance !== "uncertain") {
    return invalid("invalid_stance", "STA stance must be support, oppose, or uncertain");
  }

  const methodValues = getTagValues(event, "m");
  if (methodValues.length > 1) {
    return invalid("duplicate_method", "STA must not contain more than one m tag");
  }

  if (methodValues[0] && !METHOD_VALUES.has(methodValues[0])) {
    return invalid("invalid_method", "STA method must be one of the supported verification methods");
  }

  const referencedClaimIds = getTagValues(event, "e");
  for (const claimId of referencedClaimIds) {
    if (!isLowercaseHexOfLength(claimId, EVENT_ID_HEX_LENGTH)) {
      return invalid("invalid_claim_reference", "STA e tags must reference lowercase-hex claim ids");
    }
  }

  return {
    ok: true,
    kind: "sta",
    attestationId: tags.eventId,
    transitionId: tags.transitionId,
    oldPubkey: tags.oldPubkey,
    newPubkey: tags.newPubkey,
    attestorPubkey: event.pubkey,
    stance,
    method: methodValues[0],
    referencedClaimIds,
    signatureStatus: "verified",
    event,
  };
}

export async function resolveSocialTransition(
  input: ResolveSocialTransitionInput,
): Promise<SocialTransitionState> {
  assertLowercaseHex32(input.oldPubkey, "oldPubkey");
  assertLowercaseHex32(input.newPubkey, "newPubkey");

  const transitionId = await computeTransitionId(input.oldPubkey, input.newPubkey);

  const claims = (await Promise.all(input.claims.map((event) => validateSocialClaim(event))))
    .filter((claim): claim is ValidatedClaim => claim.ok)
    .filter((claim) => claim.transitionId === transitionId);

  if (claims.length === 0) {
    return { state: "none" };
  }

  const liveAttestations = latestAttestations(
    (await Promise.all(input.attestations.map((event) => validateSocialAttestation(event))))
      .filter((attestation): attestation is ValidatedAttestation => attestation.ok)
      .filter((attestation) => attestation.transitionId === transitionId),
  );

  const supportPubkeys: Hex32[] = [];
  const opposePubkeys: Hex32[] = [];
  const selfAssertedSupportPubkeys: Hex32[] = [];
  const selfAssertedOpposePubkeys: Hex32[] = [];
  const trustedSet = input.viewerTrustedSet ?? new Set<Hex32>();

  for (const attestation of liveAttestations) {
    const isSelfAttestation =
      attestation.attestorPubkey === input.oldPubkey || attestation.attestorPubkey === input.newPubkey;

    if (attestation.stance === "support") {
      if (isSelfAttestation) {
        selfAssertedSupportPubkeys.push(attestation.attestorPubkey);
      } else if (
        input.viewerFollowSet.has(attestation.attestorPubkey) ||
        trustedSet.has(attestation.attestorPubkey)
      ) {
        supportPubkeys.push(attestation.attestorPubkey);
      }
    }

    if (attestation.stance === "oppose") {
      if (isSelfAttestation) {
        selfAssertedOpposePubkeys.push(attestation.attestorPubkey);
      } else if (
        input.viewerFollowSet.has(attestation.attestorPubkey) ||
        trustedSet.has(attestation.attestorPubkey)
      ) {
        opposePubkeys.push(attestation.attestorPubkey);
      }
    }
  }

  const claimIds = claims.map((claim) => claim.claimId);
  const claimRoles = dedupeRoles(claims.map((claim) => claim.role));
  const baseState = {
    oldPubkey: input.oldPubkey,
    newPubkey: input.newPubkey,
    claimIds,
    claimRoles,
    selfAssertedSupportPubkeys,
    selfAssertedOpposePubkeys,
  };

  if (supportPubkeys.length > 0 && opposePubkeys.length > 0) {
    return {
      state: "socially_split",
      ...baseState,
      supportPubkeys,
      opposePubkeys,
    };
  }

  if (supportPubkeys.length > 0) {
    return {
      state: "socially_supported",
      ...baseState,
      supportPubkeys,
    };
  }

  if (opposePubkeys.length > 0) {
    return {
      state: "socially_opposed",
      ...baseState,
      opposePubkeys,
    };
  }

  return {
    state: "claimed",
    ...baseState,
  };
}

type CoreTransitionTags =
  | {
      ok: true;
      eventId: EventId;
      transitionId: string;
      oldPubkey: Hex32;
      newPubkey: Hex32;
    }
  | Invalid;

async function extractCoreTransitionTags(event: NostrEvent, label: string): Promise<CoreTransitionTags> {
  try {
    assertLowercaseHex32(event.pubkey, "event.pubkey");
  } catch (error) {
    return invalid("invalid_pubkey", getErrorMessage(error));
  }

  const dValues = getTagValues(event, "d");
  const oValues = getTagValues(event, "o");
  const nValues = getTagValues(event, "n");

  if (dValues.length !== 1) {
    return invalid("invalid_d_tag", `${label} must contain exactly one d tag`);
  }

  if (oValues.length !== 1) {
    return invalid("invalid_o_tag", `${label} must contain exactly one o tag`);
  }

  if (nValues.length !== 1) {
    return invalid("invalid_n_tag", `${label} must contain exactly one n tag`);
  }

  const transitionId = dValues[0];
  const oldPubkey = oValues[0];
  const newPubkey = nValues[0];

  try {
    assertLowercaseHex32(oldPubkey, "o");
    assertLowercaseHex32(newPubkey, "n");
  } catch (error) {
    return invalid("invalid_pubkey_tag", getErrorMessage(error));
  }

  if (oldPubkey === newPubkey) {
    return invalid("same_old_and_new_key", `${label} old and new pubkeys must differ`);
  }

  const expectedTransitionId = await computeTransitionId(oldPubkey, newPubkey);

  if (transitionId !== expectedTransitionId) {
    return invalid("transition_id_mismatch", `${label} d tag must match the computed transition id`);
  }

  const eventId = validateSignedEventEnvelope(event, label);
  if (!eventId.ok) {
    return eventId;
  }

  return {
    ok: true,
    eventId: eventId.eventId,
    transitionId,
    oldPubkey,
    newPubkey,
  };
}

function latestAttestations(attestations: ValidatedAttestation[]): ValidatedAttestation[] {
  const latest = new Map<string, ValidatedAttestation>();

  for (const attestation of attestations) {
    const key = `${attestation.attestorPubkey}:${attestation.transitionId}`;
    const existing = latest.get(key);

    if (!existing) {
      latest.set(key, attestation);
      continue;
    }

    if (attestation.event.created_at > existing.event.created_at) {
      latest.set(key, attestation);
      continue;
    }

    if (
      attestation.event.created_at === existing.event.created_at &&
      attestation.attestationId < existing.attestationId
    ) {
      latest.set(key, attestation);
    }
  }

  return [...latest.values()];
}

function validateSignedEventEnvelope(
  event: NostrEvent,
  label: string,
): { ok: true; eventId: EventId } | Invalid {
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

  return { ok: true, eventId: event.id };
}

function dedupeRoles(roles: Array<"old" | "new">): Array<"old" | "new"> {
  return [...new Set(roles)];
}

function invalid(code: string, reason: string): Invalid {
  return { ok: false, code, reason };
}

function isLowercaseHexOfLength(value: string, length: number): boolean {
  return value.length === length && HEX_PATTERN.test(value);
}

function assertEventId(value: string, label: string): void {
  if (!isLowercaseHexOfLength(value, EVENT_ID_HEX_LENGTH)) {
    throw new ProtocolError(`${label} must be 32-byte lowercase hex`);
  }
}

function assertSignedEventShape(
  event: NostrEvent,
  input: { expectedPubkey: Hex32; expectedKind: number; label: string },
): void {
  if (event.pubkey !== input.expectedPubkey) {
    throw new ProtocolError(`signed ${input.label} pubkey does not match the requested signer`);
  }

  if (event.kind !== input.expectedKind) {
    throw new ProtocolError(`signed ${input.label} kind does not match the requested kind`);
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
