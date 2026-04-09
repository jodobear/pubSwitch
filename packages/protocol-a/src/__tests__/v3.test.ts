import { describe, expect, test } from "bun:test";
import {
  deriveSchnorrPublicKey,
  signNostrEventWithSecretKey,
  signSchnorrDigestWithSecretKey,
  type NostrEvent,
} from "@tack/protocol-shared";
import {
  buildPmaV3,
  buildPmuV3,
  buildPmxV3,
  computePmuDetachedSignDigestV3,
  computePmxDetachedSignDigestV3,
  resolvePreparedMigrationV3,
  summarizeLegacyOtsProofs,
} from "../index";

const OLD_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000031";
const MIGRATION_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000032";
const NEXT_MIGRATION_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000033";
const OTHER_MIGRATION_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000034";
const NEW_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000035";
const OLD_PUBKEY = deriveSchnorrPublicKey(OLD_SECRET_KEY);
const MIGRATION_PUBKEY = deriveSchnorrPublicKey(MIGRATION_SECRET_KEY);
const NEXT_MIGRATION_PUBKEY = deriveSchnorrPublicKey(NEXT_MIGRATION_SECRET_KEY);
const OTHER_MIGRATION_PUBKEY = deriveSchnorrPublicKey(OTHER_MIGRATION_SECRET_KEY);
const NEW_PUBKEY = deriveSchnorrPublicKey(NEW_SECRET_KEY);
const OTS_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000036";

describe("protocol-a v3", () => {
  test("builds a v3 PMA with the required root tag", async () => {
    const pma = await buildPmaV3({
      oldSigner: createSigner(OLD_SECRET_KEY),
      migrationPubkey: MIGRATION_PUBKEY,
      createdAt: 1_700_500_000,
    });

    expect(pma.tags).toEqual([
      ["o", OLD_PUBKEY],
      ["m", MIGRATION_PUBKEY],
      ["t", "root"],
      ["alt", "Prepared Migration Authority"],
    ]);
  });

  test("matches the v3 detached-signature digest vectors", async () => {
    await expect(
      computePmuDetachedSignDigestV3({
        oldPubkey: OLD_PUBKEY,
        rootAuthorityId: "a".repeat(64),
        previousAuthorityId: "b".repeat(64),
        currentMigrationPubkey: MIGRATION_PUBKEY,
        nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
        createdAt: 1_700_500_001,
      }),
    ).resolves.toHaveLength(64);

    await expect(
      computePmxDetachedSignDigestV3({
        transitionId: "c".repeat(64),
        rootAuthorityId: "a".repeat(64),
        activeAuthorityId: "b".repeat(64),
        oldPubkey: OLD_PUBKEY,
        newPubkey: NEW_PUBKEY,
        createdAt: 1_700_500_002,
      }),
    ).resolves.toHaveLength(64);
  });

  test("resolves a confirmed v3 authority chain to prepared_migrated", async () => {
    const pma = await buildPmaV3({
      oldSigner: createSigner(OLD_SECRET_KEY),
      migrationPubkey: MIGRATION_PUBKEY,
      createdAt: 1_700_500_010,
    });
    const pmaProof = createConfirmedProof(pma, 1776, 840_000);
    const pmu = await buildPmuV3({
      oldPubkey: OLD_PUBKEY,
      rootAuthorityId: pma.id!,
      previousAuthorityId: pma.id!,
      currentMigrationSigner: createSigner(MIGRATION_SECRET_KEY),
      nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
      oldDetachedSigner: createDetachedSigner(OLD_SECRET_KEY),
      nextDetachedSigner: createDetachedSigner(NEXT_MIGRATION_SECRET_KEY),
      createdAt: 1_700_500_020,
    });
    const pmuProof = createConfirmedProof(pmu, 1779, 840_001);
    const pmx = await buildPmxV3({
      rootAuthorityId: pma.id!,
      authorityId: pmu.id!,
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createSigner(NEXT_MIGRATION_SECRET_KEY),
      newSigner: createSigner(NEW_SECRET_KEY),
      createdAt: 1_700_500_030,
    });

    expect(
      resolvePreparedMigrationV3({
        oldPubkey: OLD_PUBKEY,
        events: [pma, pmu, pmx],
        proofs: summarizeLegacyOtsProofs([pmaProof, pmuProof]),
      }),
    ).toMatchObject({
      state: "prepared_migrated",
      newPubkey: NEW_PUBKEY,
    });
  });

  test("returns conflicting_roots when two roots share the same earliest anchor", async () => {
    const rootA = await buildPmaV3({
      oldSigner: createSigner(OLD_SECRET_KEY),
      migrationPubkey: MIGRATION_PUBKEY,
      createdAt: 1_700_500_100,
    });
    const rootB = await buildPmaV3({
      oldSigner: createSigner(OLD_SECRET_KEY),
      migrationPubkey: OTHER_MIGRATION_PUBKEY,
      createdAt: 1_700_500_101,
    });

    expect(
      resolvePreparedMigrationV3({
        oldPubkey: OLD_PUBKEY,
        events: [rootA, rootB],
        proofs: summarizeLegacyOtsProofs([
          createConfirmedProof(rootA, 1776, 840_010),
          createConfirmedProof(rootB, 1776, 840_010),
        ]),
      }),
    ).toMatchObject({
      state: "conflicting_roots",
      roots: expect.arrayContaining([
        expect.objectContaining({ migrationPubkey: MIGRATION_PUBKEY }),
        expect.objectContaining({ migrationPubkey: OTHER_MIGRATION_PUBKEY }),
      ]),
    });
  });
});

function createSigner(secretKey: string) {
  const pubkey = deriveSchnorrPublicKey(secretKey);
  return {
    async getPublicKey() {
      return pubkey;
    },
    async signEvent(event: Omit<NostrEvent, "id" | "sig">) {
      return signNostrEventWithSecretKey(event, secretKey);
    },
    async signDigest(digestHex: string) {
      return signSchnorrDigestWithSecretKey(secretKey, digestHex);
    },
  };
}

function createDetachedSigner(secretKey: string) {
  const pubkey = deriveSchnorrPublicKey(secretKey);
  return {
    async getPublicKey() {
      return pubkey;
    },
    async signDigest(digestHex: string) {
      return signSchnorrDigestWithSecretKey(secretKey, digestHex);
    },
  };
}

function createConfirmedProof(event: NostrEvent, targetKind: 1776 | 1779, anchorHeight: number): NostrEvent {
  return signNostrEventWithSecretKey(
    {
      pubkey: deriveSchnorrPublicKey(OTS_SECRET_KEY),
      created_at: event.created_at + 1,
      kind: 1040,
      tags: [
        ["e", event.id!],
        ["k", String(targetKind)],
        ["x-verified-anchor-height", String(anchorHeight)],
      ],
      content: Buffer.from(`proof ${event.id}`, "utf8").toString("base64"),
    },
    OTS_SECRET_KEY,
  );
}
