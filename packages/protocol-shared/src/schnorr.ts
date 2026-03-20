import { schnorr } from "@noble/curves/secp256k1";
import { ProtocolError } from "./errors";
import { assertLowercaseHex32, bytesToHex, hexToBytes } from "./hex";
import { canonicalJsonArray } from "./json";
import type { EventId, Hex32, NostrEvent } from "./nostr";
import { sha256HexSync } from "./sha256";

const SIGNATURE_HEX_LENGTH = 128;
const SECRET_KEY_HEX_LENGTH = 64;
const LOWERCASE_HEX_PATTERN = /^[0-9a-f]+$/;

export type UnsignedNostrEvent = Omit<NostrEvent, "id" | "sig">;

export function computeNostrEventIdSync(event: UnsignedNostrEvent | NostrEvent): EventId {
  assertLowercaseHex32(event.pubkey, "event.pubkey");

  return sha256HexSync(
    canonicalJsonArray([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content,
    ]),
  );
}

export function verifyNostrEventSignature(event: NostrEvent): boolean {
  if (!event.id || !event.sig) {
    return false;
  }

  const expectedEventId = computeNostrEventIdSync(event);
  if (event.id !== expectedEventId) {
    return false;
  }

  return verifySchnorrDigestSignature({
    messageHashHex: event.id,
    signatureHex: event.sig,
    pubkeyHex: event.pubkey,
  });
}

export function verifySchnorrDigestSignature(input: {
  messageHashHex: string;
  signatureHex: string;
  pubkeyHex: Hex32;
}): boolean {
  try {
    assertLowercaseHex32(input.messageHashHex, "messageHashHex");
    assertLowercaseHex32(input.pubkeyHex, "pubkeyHex");
    assertSignatureHex(input.signatureHex, "signatureHex");
    return schnorr.verify(input.signatureHex, input.messageHashHex, input.pubkeyHex);
  } catch {
    return false;
  }
}

export function deriveSchnorrPublicKey(secretKeyHex: string): Hex32 {
  const secretKeyBytes = decodeSecretKeyHex(secretKeyHex);
  return bytesToHex(schnorr.getPublicKey(secretKeyBytes));
}

export function signNostrEventWithSecretKey(
  event: UnsignedNostrEvent,
  secretKeyHex: string,
): NostrEvent {
  const pubkey = deriveSchnorrPublicKey(secretKeyHex);
  if (event.pubkey !== pubkey) {
    throw new ProtocolError("event pubkey does not match the provided secret key");
  }

  const id = computeNostrEventIdSync(event);

  return {
    ...event,
    id,
    sig: signSchnorrDigestWithSecretKey(secretKeyHex, id),
  };
}

export function signSchnorrDigestWithSecretKey(secretKeyHex: string, digestHex: string): string {
  assertLowercaseHex32(digestHex, "digestHex");

  try {
    return bytesToHex(schnorr.sign(digestHex, decodeSecretKeyHex(secretKeyHex)));
  } catch (error) {
    throw new ProtocolError(`failed to sign Schnorr digest: ${getErrorMessage(error)}`);
  }
}

function decodeSecretKeyHex(secretKeyHex: string): Uint8Array {
  if (secretKeyHex.length !== SECRET_KEY_HEX_LENGTH) {
    throw new ProtocolError("secretKeyHex must be 32-byte lowercase hex");
  }

  if (!LOWERCASE_HEX_PATTERN.test(secretKeyHex)) {
    throw new ProtocolError("secretKeyHex must be lowercase hex");
  }

  try {
    return hexToBytes(secretKeyHex);
  } catch (error) {
    throw new ProtocolError(`failed to decode secret key: ${getErrorMessage(error)}`);
  }
}

function assertSignatureHex(value: string, label: string): void {
  if (value.length !== SIGNATURE_HEX_LENGTH) {
    throw new ProtocolError(`${label} must be 64-byte lowercase hex`);
  }

  if (!LOWERCASE_HEX_PATTERN.test(value)) {
    throw new ProtocolError(`${label} must be lowercase hex`);
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
