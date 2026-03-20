import { describe, expect, test } from "bun:test";
import {
  computeNostrEventIdSync,
  deriveSchnorrPublicKey,
  signNostrEventWithSecretKey,
  signSchnorrDigestWithSecretKey,
  verifyNostrEventSignature,
  verifySchnorrDigestSignature,
  type UnsignedNostrEvent,
} from "../index";

const OLD_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000001";
const OLD_PUBKEY = "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";

describe("Schnorr helpers", () => {
  test("derive deterministic public keys from fixed secret keys", () => {
    expect(deriveSchnorrPublicKey(OLD_SECRET_KEY)).toBe(OLD_PUBKEY);
  });

  test("sign and verify Nostr events with one canonical event-id path", () => {
    const unsignedEvent: UnsignedNostrEvent = {
      pubkey: OLD_PUBKEY,
      created_at: 1_700_000_000,
      kind: 1776,
      tags: [
        ["o", OLD_PUBKEY],
        ["m", "c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"],
      ],
      content: "",
    };

    const signedEvent = signNostrEventWithSecretKey(unsignedEvent, OLD_SECRET_KEY);

    expect(signedEvent.id).toBe(computeNostrEventIdSync(unsignedEvent));
    expect(verifyNostrEventSignature(signedEvent)).toBe(true);
  });

  test("sign and verify detached Schnorr digests", () => {
    const digestHex = "67eb68019a65c7d24354f135d730f57c52c4ced40a372ea96d10d51dc8a943a7";
    const signatureHex = signSchnorrDigestWithSecretKey(OLD_SECRET_KEY, digestHex);

    expect(
      verifySchnorrDigestSignature({
        messageHashHex: digestHex,
        signatureHex,
        pubkeyHex: OLD_PUBKEY,
      }),
    ).toBe(true);
  });

  test("rejects tampered event and detached signatures", () => {
    const unsignedEvent: UnsignedNostrEvent = {
      pubkey: OLD_PUBKEY,
      created_at: 1_700_000_000,
      kind: 1776,
      tags: [["o", OLD_PUBKEY]],
      content: "",
    };
    const signedEvent = signNostrEventWithSecretKey(unsignedEvent, OLD_SECRET_KEY);
    const digestHex = "67eb68019a65c7d24354f135d730f57c52c4ced40a372ea96d10d51dc8a943a7";
    const tamperedEventSig = flipLastHexNibble(signedEvent.sig!);
    const tamperedDigestSig = flipLastHexNibble(signSchnorrDigestWithSecretKey(OLD_SECRET_KEY, digestHex));

    expect(
      verifyNostrEventSignature({
        ...signedEvent,
        sig: tamperedEventSig,
      }),
    ).toBe(false);
    expect(
      verifySchnorrDigestSignature({
        messageHashHex: digestHex,
        signatureHex: tamperedDigestSig,
        pubkeyHex: OLD_PUBKEY,
      }),
    ).toBe(false);
  });
});

function flipLastHexNibble(value: string): string {
  const last = value.at(-1);
  if (!last) {
    throw new Error("cannot tamper with an empty hex string");
  }

  return `${value.slice(0, -1)}${last === "0" ? "1" : "0"}`;
}
