import { describe, expect, test } from "bun:test";
import {
  deriveSchnorrPublicKey,
  signNostrEventWithSecretKey,
  signSchnorrDigestWithSecretKey,
  type NostrEvent,
} from "@tack/protocol-shared";
import {
  OTS_KIND,
  PMA_KIND,
  PMU_KIND,
  PMX_KIND,
  VERIFIED_ANCHOR_HEIGHT_TAG,
  buildPma,
  buildPmu,
  buildPmx,
  computeNostrEventId,
  computePmuDetachedSignDigest,
  computePmxDetachedSignDigest,
  createAuthorityIndex,
  resolvePreparedMigration,
  toAuthorityRecord,
  validatePma,
  validatePmu,
  validatePmx,
  type DetachedSignerLike,
  type SignerLike,
  type UnsignedNostrEvent,
} from "../index";

const OLD_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000001";
const MIGRATION_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000002";
const NEXT_MIGRATION_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000003";
const OTHER_MIGRATION_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000004";
const NEW_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000005";
const OTHER_NEW_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000006";
const OLD_PUBKEY = deriveSchnorrPublicKey(OLD_SECRET_KEY);
const MIGRATION_PUBKEY = deriveSchnorrPublicKey(MIGRATION_SECRET_KEY);
const NEXT_MIGRATION_PUBKEY = deriveSchnorrPublicKey(NEXT_MIGRATION_SECRET_KEY);
const OTHER_MIGRATION_PUBKEY = deriveSchnorrPublicKey(OTHER_MIGRATION_SECRET_KEY);
const NEW_PUBKEY = deriveSchnorrPublicKey(NEW_SECRET_KEY);
const OTHER_NEW_PUBKEY = deriveSchnorrPublicKey(OTHER_NEW_SECRET_KEY);
const OTS_PUBKEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("buildPma", () => {
  test("builds a signed PMA event with frozen tags", async () => {
    const event = await buildPma({
      oldSigner: createFakeSigner(OLD_PUBKEY),
      migrationPubkey: MIGRATION_PUBKEY,
      createdAt: 1_700_000_000,
    });

    expect(event).toMatchObject({
      pubkey: OLD_PUBKEY,
      created_at: 1_700_000_000,
      kind: PMA_KIND,
      content: "",
      tags: [
        ["o", OLD_PUBKEY],
        ["m", MIGRATION_PUBKEY],
        ["alt", "Prepared Migration Authority"],
      ],
    });

    expect(event.id).toHaveLength(64);
    expect(event.sig).toHaveLength(128);
  });
});

describe("computePmuDetachedSignDigest", () => {
  test("matches the frozen detached-signature digest vector", async () => {
    await expect(
      computePmuDetachedSignDigest({
        oldPubkey: OLD_PUBKEY,
        previousAuthorityId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        currentMigrationPubkey: MIGRATION_PUBKEY,
        nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
        createdAt: 1_700_000_123,
      }),
    ).resolves.toBe("6954129c625f795a1141ef36616c4901284214ad6809351ea96eca8dd0e33664");
  });
});

describe("computePmxDetachedSignDigest", () => {
  test("matches the frozen execution detached-signature digest vector", async () => {
    await expect(
      computePmxDetachedSignDigest({
        authorityId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        oldPubkey: OLD_PUBKEY,
        newPubkey: NEW_PUBKEY,
        createdAt: 1_700_000_456,
      }),
    ).resolves.toBe("dbc29608542a4d3a9cb4fb606e2b871ca26b7e97a1269268d4fd0dd1a7b6bf2a");
  });
});

describe("buildPmu", () => {
  test("builds a PMU using the canonical detached-signature digest", async () => {
    const event = await buildPmu({
      oldPubkey: OLD_PUBKEY,
      previousAuthorityId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY),
      nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
      oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "old"),
      nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "next"),
      createdAt: 1_700_000_123,
    });

    expect(event).toMatchObject({
      pubkey: MIGRATION_PUBKEY,
      created_at: 1_700_000_123,
      kind: PMU_KIND,
      content: "",
      tags: [
        ["o", OLD_PUBKEY],
        ["e", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
        ["u", NEXT_MIGRATION_PUBKEY],
        ["os", expect.stringMatching(/^[0-9a-f]{128}$/)],
        ["ns", expect.stringMatching(/^[0-9a-f]{128}$/)],
        ["alt", "Prepared Migration Authority Update"],
      ],
    });
  });
});

describe("buildPmx", () => {
  test("builds a PMX using the canonical execution digest", async () => {
    const event = await buildPmx({
      authorityId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY),
      newSigner: createFakeSigner(NEW_PUBKEY, "new"),
      createdAt: 1_700_000_456,
    });

    expect(event).toMatchObject({
      pubkey: NEXT_MIGRATION_PUBKEY,
      created_at: 1_700_000_456,
      kind: PMX_KIND,
      content: "",
      tags: [
        ["o", OLD_PUBKEY],
        ["n", NEW_PUBKEY],
        ["e", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
        ["ns", expect.stringMatching(/^[0-9a-f]{128}$/)],
        ["alt", "Prepared Migration Execution"],
      ],
    });
  });
});

describe("validatePma", () => {
  test("accepts a PMA with locally verified 1040 anchor metadata", async () => {
    const event = await buildPma({
      oldSigner: createFakeSigner(OLD_PUBKEY),
      migrationPubkey: MIGRATION_PUBKEY,
      createdAt: 1_700_000_000,
    });

    const verifiedProof = createOtsProof(event, {
      id: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      kind: PMA_KIND,
      anchorHeight: 840_000,
    });

    const validated = validatePma(event, [verifiedProof]);

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      throw new Error("expected PMA validation success");
    }

    expect(validated.anchorHeight).toBe(840_000);
    expect(validated.migrationPubkey).toBe(MIGRATION_PUBKEY);
    expect(validated.signatureStatus).toBe("verified");
  });

  test("rejects a PMA with a tampered event signature", async () => {
    const event = await buildPma({
      oldSigner: createFakeSigner(OLD_PUBKEY),
      migrationPubkey: MIGRATION_PUBKEY,
      createdAt: 1_700_000_000,
    });
    const verifiedProof = createOtsProof(event, {
      id: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      kind: PMA_KIND,
      anchorHeight: 840_000,
    });

    expect(
      validatePma(
        {
          ...event,
          sig: tamperHex(event.sig!),
        },
        [verifiedProof],
      ),
    ).toEqual({
      ok: false,
      code: "invalid_sig",
      reason: "PMA event signature must pass Schnorr verification",
    });
  });
});

describe("validatePmu", () => {
  test("accepts a PMU when the parent authority is confirmed", async () => {
    const root = await createConfirmedRoot();
    const authorityIndex = createAuthorityIndex([toAuthorityRecord(root.validated)]);
    const pmu = await buildPmu({
      oldPubkey: OLD_PUBKEY,
      previousAuthorityId: root.event.id!,
      currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY),
      nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
      oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "old"),
      nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "next"),
      createdAt: 1_700_000_200,
    });
    const pmuProof = createOtsProof(pmu, {
      id: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      kind: PMU_KIND,
      anchorHeight: 840_010,
    });

    const validated = validatePmu(pmu, authorityIndex, [pmuProof]);

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      throw new Error("expected PMU validation success");
    }

    expect(validated.previousAuthorityCanonicalId).toBe(root.event.id);
    expect(validated.currentMigrationPubkey).toBe(MIGRATION_PUBKEY);
    expect(validated.nextMigrationPubkey).toBe(NEXT_MIGRATION_PUBKEY);
    expect(validated.signatureStatus).toBe("verified");
  });

  test("rejects a PMU with a tampered detached signature", async () => {
    const root = await createConfirmedRoot();
    const authorityIndex = createAuthorityIndex([toAuthorityRecord(root.validated)]);
    const pmu = await buildPmu({
      oldPubkey: OLD_PUBKEY,
      previousAuthorityId: root.event.id!,
      currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY),
      nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
      oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "old"),
      nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "next"),
      createdAt: 1_700_000_200,
    });
    const pmuProof = createOtsProof(pmu, {
      id: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      kind: PMU_KIND,
      anchorHeight: 840_010,
    });
    const tamperedPmu = await createFakeSigner(MIGRATION_PUBKEY).signEvent({
      pubkey: pmu.pubkey,
      created_at: pmu.created_at,
      kind: pmu.kind,
      tags: pmu.tags.map((tag) => (tag[0] === "os" ? [tag[0], tamperHex(tag[1]!)] : tag)),
      content: pmu.content,
    });

    expect(
      validatePmu(tamperedPmu, authorityIndex, [pmuProof]),
    ).toEqual({
      ok: false,
      code: "invalid_os_sig",
      reason: "PMU os tag must be a valid Schnorr signature over the detached digest",
    });
  });
});

describe("validatePmx", () => {
  test("accepts a PMX when it references the active confirmed authority", async () => {
    const activeAuthority = await createConfirmedUpdatedAuthority();
    const pmx = await buildPmx({
      authorityId: activeAuthority.authority.canonicalAuthorityId,
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY),
      newSigner: createFakeSigner(NEW_PUBKEY, "new"),
      createdAt: 1_700_000_456,
    });

    const validated = validatePmx(pmx, activeAuthority.authority);

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      throw new Error("expected PMX validation success");
    }

    expect(validated.activeAuthorityCanonicalId).toBe(activeAuthority.authority.canonicalAuthorityId);
    expect(validated.newPubkey).toBe(NEW_PUBKEY);
    expect(validated.signatureStatus).toBe("verified");
  });

  test("rejects a PMX that references a stale authority", async () => {
    const activeAuthority = await createConfirmedUpdatedAuthority();
    const staleAuthorityId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const pmx = await buildPmx({
      authorityId: staleAuthorityId,
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY),
      newSigner: createFakeSigner(NEW_PUBKEY, "new"),
      createdAt: 1_700_000_456,
    });

    expect(validatePmx(pmx, activeAuthority.authority)).toEqual({
      ok: false,
      code: "stale_authority_reference",
      reason: "PMX must reference the active confirmed authority",
    });
  });

  test("rejects a PMX with a tampered successor signature", async () => {
    const activeAuthority = await createConfirmedUpdatedAuthority();
    const pmx = await buildPmx({
      authorityId: activeAuthority.authority.canonicalAuthorityId,
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY),
      newSigner: createFakeSigner(NEW_PUBKEY, "new"),
      createdAt: 1_700_000_456,
    });
    const tamperedPmx = await createFakeSigner(NEXT_MIGRATION_PUBKEY).signEvent({
      pubkey: pmx.pubkey,
      created_at: pmx.created_at,
      kind: pmx.kind,
      tags: pmx.tags.map((tag) => (tag[0] === "ns" ? [tag[0], tamperHex(tag[1]!)] : tag)),
      content: pmx.content,
    });

    expect(validatePmx(tamperedPmx, activeAuthority.authority)).toEqual({
      ok: false,
      code: "invalid_ns_sig",
      reason: "PMX ns tag must be a valid Schnorr signature over the detached digest",
    });
  });
});

describe("resolvePreparedMigration", () => {
  test("returns draft_local for an unsigned PMA draft", () => {
    const draftEvent: NostrEvent = {
      pubkey: OLD_PUBKEY,
      created_at: 1_700_000_000,
      kind: PMA_KIND,
      tags: [
        ["o", OLD_PUBKEY],
        ["m", MIGRATION_PUBKEY],
      ],
      content: "",
    };

    expect(
      resolvePreparedMigration({
        oldPubkey: OLD_PUBKEY,
        events: [draftEvent],
        otsProofs: [],
      }),
    ).toEqual({ state: "draft_local" });
  });

  test("returns published_pending_ots for a signed PMA without verified anchor metadata", async () => {
    const event = await buildPma({
      oldSigner: createFakeSigner(OLD_PUBKEY),
      migrationPubkey: MIGRATION_PUBKEY,
      createdAt: 1_700_000_000,
    });

    const pendingProof = createOtsProof(event, {
      id: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      kind: PMA_KIND,
    });

    expect(
      resolvePreparedMigration({
        oldPubkey: OLD_PUBKEY,
        events: [event],
        otsProofs: [pendingProof],
      }),
    ).toEqual({ state: "published_pending_ots" });
  });

  test("walks a confirmed PMA to a confirmed PMU authority update", async () => {
    const { events, otsProofs, pmu } = await createConfirmedAuthorityChain();

    expect(
      resolvePreparedMigration({
        oldPubkey: OLD_PUBKEY,
        events,
        otsProofs,
      }),
    ).toEqual({
      state: "bitcoin_confirmed",
      authorityId: pmu.id,
    });
  });

  test("returns executed when one distinct PMX successor remains", async () => {
    const { events, otsProofs, pmu } = await createConfirmedAuthorityChain();
    const pmx = await buildPmx({
      authorityId: pmu.id!,
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY),
      newSigner: createFakeSigner(NEW_PUBKEY, "new"),
      createdAt: 1_700_000_456,
    });

    expect(
      resolvePreparedMigration({
        oldPubkey: OLD_PUBKEY,
        events: [...events, pmx],
        otsProofs,
      }),
    ).toEqual({
      state: "executed",
      authorityId: pmu.id,
      newPubkey: NEW_PUBKEY,
    });
  });

  test("collapses duplicate PMXs before execution conflict detection", async () => {
    const { events, otsProofs, pmu } = await createConfirmedAuthorityChain();
    const pmxA = await buildPmx({
      authorityId: pmu.id!,
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY),
      newSigner: createFakeSigner(NEW_PUBKEY, "new-a"),
      createdAt: 1_700_000_456,
    });
    const pmxB = await buildPmx({
      authorityId: pmu.id!,
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY, "mig-b"),
      newSigner: createFakeSigner(NEW_PUBKEY, "new-b"),
      createdAt: 1_700_000_457,
    });

    expect(
      resolvePreparedMigration({
        oldPubkey: OLD_PUBKEY,
        events: [...events, pmxA, pmxB],
        otsProofs,
      }),
    ).toEqual({
      state: "executed",
      authorityId: pmu.id,
      newPubkey: NEW_PUBKEY,
    });
  });

  test("surfaces conflict when distinct PMX successors remain", async () => {
    const { events, otsProofs, pmu } = await createConfirmedAuthorityChain();
    const pmxA = await buildPmx({
      authorityId: pmu.id!,
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY),
      newSigner: createFakeSigner(NEW_PUBKEY, "new-a"),
      createdAt: 1_700_000_456,
    });
    const pmxB = await buildPmx({
      authorityId: pmu.id!,
      oldPubkey: OLD_PUBKEY,
      migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY, "mig-b"),
      newSigner: createFakeSigner(OTHER_NEW_PUBKEY, "new-b"),
      createdAt: 1_700_000_457,
    });

    expect(
      resolvePreparedMigration({
        oldPubkey: OLD_PUBKEY,
        events: [...events, pmxA, pmxB],
        otsProofs,
      }),
    ).toEqual({
      state: "conflict",
      conflictKind: "multiple_executions",
      authorityId: pmu.id,
      conflictingExecutionIds: [pmxA.id, pmxB.id],
      reason: `multiple confirmed PMX executions reference authority ${pmu.id}`,
    });
  });

  test("surfaces structured root conflict metadata when multiple earliest roots remain", async () => {
    const rootA = await buildPma({
      oldSigner: createFakeSigner(OLD_PUBKEY, "root-a"),
      migrationPubkey: MIGRATION_PUBKEY,
      createdAt: 1_700_000_000,
    });
    const rootB = await buildPma({
      oldSigner: createFakeSigner(OLD_PUBKEY, "root-b"),
      migrationPubkey: OTHER_MIGRATION_PUBKEY,
      createdAt: 1_700_000_001,
    });
    const rootAProof = createOtsProof(rootA, {
      id: "abababababababababababababababababababababababababababababababab",
      kind: PMA_KIND,
      anchorHeight: 840_000,
    });
    const rootBProof = createOtsProof(rootB, {
      id: "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
      kind: PMA_KIND,
      anchorHeight: 840_000,
    });

    expect(
      resolvePreparedMigration({
        oldPubkey: OLD_PUBKEY,
        events: [rootA, rootB],
        otsProofs: [rootAProof, rootBProof],
      }),
    ).toEqual({
      state: "conflict",
      conflictKind: "multiple_roots",
      anchorHeight: 840_000,
      authorityIds: [rootA.id, rootB.id],
      reason: "multiple confirmed PMA roots share anchor height 840000",
    });
  });

  test("surfaces structured child conflict metadata when multiple confirmed PMU children remain", async () => {
    const { event: root, proof: rootProof, validated: validatedRoot } = await createConfirmedRoot();
    const authorityIndex = createAuthorityIndex([toAuthorityRecord(validatedRoot)]);
    const pmuA = await buildPmu({
      oldPubkey: OLD_PUBKEY,
      previousAuthorityId: root.id!,
      currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY, "child-a"),
      nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
      oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "child-old-a"),
      nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "child-next-a"),
      createdAt: 1_700_000_200,
    });
    const pmuB = await buildPmu({
      oldPubkey: OLD_PUBKEY,
      previousAuthorityId: root.id!,
      currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY, "child-b"),
      nextMigrationPubkey: OTHER_MIGRATION_PUBKEY,
      oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "child-old-b"),
      nextDetachedSigner: createFakeDetachedSigner(OTHER_MIGRATION_PUBKEY, "child-next-b"),
      createdAt: 1_700_000_201,
    });
    const pmuAProof = createOtsProof(pmuA, {
      id: "efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef",
      kind: PMU_KIND,
      anchorHeight: 840_010,
    });
    const pmuBProof = createOtsProof(pmuB, {
      id: "1212121212121212121212121212121212121212121212121212121212121212",
      kind: PMU_KIND,
      anchorHeight: 840_011,
    });

    expect(validatePmu(pmuA, authorityIndex, [pmuAProof]).ok).toBe(true);
    expect(validatePmu(pmuB, authorityIndex, [pmuBProof]).ok).toBe(true);

    expect(
      resolvePreparedMigration({
        oldPubkey: OLD_PUBKEY,
        events: [root, pmuA, pmuB],
        otsProofs: [rootProof, pmuAProof, pmuBProof],
      }),
    ).toEqual({
      state: "conflict",
      conflictKind: "multiple_children",
      authorityId: root.id,
      conflictingAuthorityIds: [pmuA.id, pmuB.id],
      reason: `multiple confirmed PMU children reference authority ${root.id}`,
    });
  });
});

async function createConfirmedRoot() {
  const event = await buildPma({
    oldSigner: createFakeSigner(OLD_PUBKEY),
    migrationPubkey: MIGRATION_PUBKEY,
    createdAt: 1_700_000_000,
  });
  const proof = createOtsProof(event, {
    id: "f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0",
    kind: PMA_KIND,
    anchorHeight: 840_000,
  });
  const validated = validatePma(event, [proof]);
  if (!validated.ok) {
    throw new Error("expected confirmed PMA root");
  }

  return { event, proof, validated };
}

async function createConfirmedUpdatedAuthority() {
  const { event: root, proof: rootProof, validated: validatedRoot } = await createConfirmedRoot();
  const authorityIndex = createAuthorityIndex([toAuthorityRecord(validatedRoot)]);
  const pmu = await buildPmu({
    oldPubkey: OLD_PUBKEY,
    previousAuthorityId: root.id!,
    currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY),
    nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
    oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "old"),
    nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "next"),
    createdAt: 1_700_000_200,
  });
  const pmuProof = createOtsProof(pmu, {
    id: "0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f",
    kind: PMU_KIND,
    anchorHeight: 840_010,
  });
  const validatedPmu = validatePmu(pmu, authorityIndex, [pmuProof]);
  if (!validatedPmu.ok) {
    throw new Error("expected confirmed PMU");
  }

  return {
    authority: toAuthorityRecord(validatedPmu),
    root,
    rootProof,
    pmu,
    pmuProof,
  };
}

async function createConfirmedAuthorityChain() {
  const { root, rootProof, pmu, pmuProof } = await createConfirmedUpdatedAuthority();

  return {
    events: [root, pmu],
    otsProofs: [rootProof, pmuProof],
    pmu,
  };
}

function createFakeSigner(pubkey: string, _suffix = "01"): SignerLike {
  const secretKeyHex = getSecretKeyForPubkey(pubkey);

  return {
    async getPublicKey() {
      return pubkey;
    },
    async signEvent(event: UnsignedNostrEvent) {
      return signNostrEventWithSecretKey(event, secretKeyHex);
    },
    async signDigest(digestHex: string) {
      return signSchnorrDigestWithSecretKey(secretKeyHex, digestHex);
    },
  };
}

function createFakeDetachedSigner(pubkey: string, _suffix: string): DetachedSignerLike {
  const secretKeyHex = getSecretKeyForPubkey(pubkey);

  return {
    async getPublicKey() {
      return pubkey;
    },
    async signDigest(digestHex: string) {
      return signSchnorrDigestWithSecretKey(secretKeyHex, digestHex);
    },
  };
}

function getSecretKeyForPubkey(pubkey: string): string {
  const secretKeyHex = SECRET_KEY_BY_PUBKEY.get(pubkey);
  if (!secretKeyHex) {
    throw new Error(`missing secret key for pubkey ${pubkey}`);
  }

  return secretKeyHex;
}

function tamperHex(value: string): string {
  const replacement = value.endsWith("0") ? "1" : "0";
  return `${value.slice(0, -1)}${replacement}`;
}

function createOtsProof(
  targetEvent: NostrEvent,
  input: { id: string; kind: number; anchorHeight?: number },
): NostrEvent {
  return {
    id: input.id,
    pubkey: OTS_PUBKEY,
    created_at: targetEvent.created_at + 60,
    kind: OTS_KIND,
    tags: [
      ["e", targetEvent.id!],
      ["k", String(input.kind)],
      ...(input.anchorHeight
        ? [[VERIFIED_ANCHOR_HEIGHT_TAG, String(input.anchorHeight)]]
        : []),
    ],
    content: "ots-proof-bytes-placeholder",
    sig: "9".repeat(128),
  };
}

const SECRET_KEY_BY_PUBKEY = new Map<string, string>([
  [OLD_PUBKEY, OLD_SECRET_KEY],
  [MIGRATION_PUBKEY, MIGRATION_SECRET_KEY],
  [NEXT_MIGRATION_PUBKEY, NEXT_MIGRATION_SECRET_KEY],
  [OTHER_MIGRATION_PUBKEY, OTHER_MIGRATION_SECRET_KEY],
  [NEW_PUBKEY, NEW_SECRET_KEY],
  [OTHER_NEW_PUBKEY, OTHER_NEW_SECRET_KEY],
]);
