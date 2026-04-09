import { describe, expect, test } from "bun:test";
import { deriveSchnorrPublicKey, signNostrEventWithSecretKey } from "../../../protocol-shared/src/index";
import {
  BUNDLE_VERSION,
  PREPARED_BUNDLE_TYPE,
  SOCIAL_BUNDLE_TYPE,
  buildPreparedBundle,
  buildSocialBundle,
  parsePreparedBundle,
  parseSocialBundle,
  serializePreparedBundle,
  serializeSocialBundle,
} from "../index";

const OLD_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000011";
const MIGRATION_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000012";
const NEW_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000013";
const OLD_PUBKEY = deriveSchnorrPublicKey(OLD_SECRET_KEY);
const MIGRATION_PUBKEY = deriveSchnorrPublicKey(MIGRATION_SECRET_KEY);
const NEW_PUBKEY = deriveSchnorrPublicKey(NEW_SECRET_KEY);

describe("evidence bundles", () => {
  test("round-trips a prepared bundle", () => {
    const pma = signNostrEventWithSecretKey(
      {
        pubkey: OLD_PUBKEY,
        created_at: 1_700_300_000,
        kind: 1776,
        tags: [
          ["o", OLD_PUBKEY],
          ["m", MIGRATION_PUBKEY],
          ["t", "root"],
        ],
        content: "",
      },
      OLD_SECRET_KEY,
    );

    const bundle = buildPreparedBundle({
      events: [pma],
      otsProofs: [
        {
          targetEventId: pma.id!,
          otsBytesBase64: "bW9jay1vdHM=",
          summary: {
            ok: true,
            targetEventId: pma.id!,
            targetKind: 1776,
            status: "bitcoin_confirmed",
            anchorHeight: 840_000,
          },
        },
      ],
      relays: ["wss://relay.example"],
    });

    expect(bundle).toMatchObject({
      version: BUNDLE_VERSION,
      type: PREPARED_BUNDLE_TYPE,
      oldPubkey: OLD_PUBKEY,
      migrationPubkeys: [MIGRATION_PUBKEY],
    });

    expect(parsePreparedBundle(serializePreparedBundle(bundle))).toEqual(bundle);
  });

  test("round-trips a social bundle", () => {
    const claim = signNostrEventWithSecretKey(
      {
        pubkey: OLD_PUBKEY,
        created_at: 1_700_300_100,
        kind: 1778,
        tags: [
          ["d", "a".repeat(64)],
          ["o", OLD_PUBKEY],
          ["n", NEW_PUBKEY],
        ],
        content: "",
      },
      OLD_SECRET_KEY,
    );

    const bundle = buildSocialBundle({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      events: [claim],
      relays: ["wss://relay.social.example"],
    });

    expect(bundle).toMatchObject({
      version: BUNDLE_VERSION,
      type: SOCIAL_BUNDLE_TYPE,
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      relays: ["wss://relay.social.example"],
    });

    expect(parseSocialBundle(serializeSocialBundle(bundle))).toEqual(bundle);
  });
});
