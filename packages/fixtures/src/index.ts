import {
  deriveSchnorrPublicKey,
  getSingleTagValue,
  signNostrEventWithSecretKey,
  signSchnorrDigestWithSecretKey,
  type Hex32,
  type NostrEvent,
} from "../../protocol-shared/src/index";
import {
  PMA_KIND,
  PMU_KIND,
  PMX_KIND,
  OTS_KIND,
  VERIFIED_ANCHOR_HEIGHT_TAG,
  buildPmaV3,
  buildPmuV3,
  buildPmxV3,
  buildPma,
  buildPmu,
  buildPmx,
  computeNostrEventId,
  resolvePreparedMigrationV3,
  resolvePreparedMigration,
  summarizeLegacyOtsProofs,
  type PreparedMigrationV3State,
  type DetachedSignerLike,
  type PreparedMigrationState,
  type SignerLike,
  type UnsignedNostrEvent,
} from "../../protocol-a/src/index";
import {
  buildSocialAttestation,
  buildSocialClaim,
  resolveSocialTransition,
  type SocialTransitionState,
} from "../../protocol-c/src/index";
export {
  getPathARealOtsCorpus,
  getPathARealOtsCorpusItem,
  type PathARealOtsCorpusItem,
} from "./path-a-real-ots";
import { getPathARealOtsCorpusItem, type PathARealOtsCorpusItem } from "./path-a-real-ots";

const OLD_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000001";
const MIGRATION_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000002";
const NEXT_MIGRATION_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000003";
const OTHER_MIGRATION_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000004";
const NEW_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000005";
const OTHER_NEW_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000006";
const SOCIAL_OLD_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000007";
const SOCIAL_NEW_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000008";
const SOCIAL_ATTESTOR_A_SECRET_KEY =
  "0000000000000000000000000000000000000000000000000000000000000009";
const SOCIAL_ATTESTOR_B_SECRET_KEY =
  "000000000000000000000000000000000000000000000000000000000000000a";
const OLD_PUBKEY = deriveSchnorrPublicKey(OLD_SECRET_KEY);
const MIGRATION_PUBKEY = deriveSchnorrPublicKey(MIGRATION_SECRET_KEY);
const NEXT_MIGRATION_PUBKEY = deriveSchnorrPublicKey(NEXT_MIGRATION_SECRET_KEY);
const OTHER_MIGRATION_PUBKEY = deriveSchnorrPublicKey(OTHER_MIGRATION_SECRET_KEY);
const NEW_PUBKEY = deriveSchnorrPublicKey(NEW_SECRET_KEY);
const OTHER_NEW_PUBKEY = deriveSchnorrPublicKey(OTHER_NEW_SECRET_KEY);
const SOCIAL_OLD_PUBKEY = deriveSchnorrPublicKey(SOCIAL_OLD_SECRET_KEY);
const SOCIAL_NEW_PUBKEY = deriveSchnorrPublicKey(SOCIAL_NEW_SECRET_KEY);
const SOCIAL_ATTESTOR_A = deriveSchnorrPublicKey(SOCIAL_ATTESTOR_A_SECRET_KEY);
const SOCIAL_ATTESTOR_B = deriveSchnorrPublicKey(SOCIAL_ATTESTOR_B_SECRET_KEY);
const OTS_PUBKEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export type PathAFixtureScenario = {
  id: string;
  title: string;
  summary: string;
  notes: string[];
  proofBacking: "fixture_placeholder" | "mixed_real_root" | "real_helper_verified";
  realOtsCorpusId?: string;
  realOtsCorpusIds?: string[];
  oldPubkey: Hex32;
  events: NostrEvent[];
  otsProofs: NostrEvent[];
  expectedState: PreparedMigrationState;
};

export type PathAV3FixtureScenario = {
  id: string;
  title: string;
  summary: string;
  notes: string[];
  oldPubkey: Hex32;
  events: NostrEvent[];
  otsProofs: NostrEvent[];
  expectedState: PreparedMigrationV3State;
};

export type PathCFixtureScenario = {
  id: string;
  title: string;
  summary: string;
  notes: string[];
  oldPubkey: Hex32;
  newPubkey: Hex32;
  viewerFollowPubkeys: Hex32[];
  claims: NostrEvent[];
  attestations: NostrEvent[];
  expectedState: SocialTransitionState;
};

let cachedPathAScenariosPromise: Promise<PathAFixtureScenario[]> | undefined;
let cachedPathAV3ScenariosPromise: Promise<PathAV3FixtureScenario[]> | undefined;
let cachedPathCScenariosPromise: Promise<PathCFixtureScenario[]> | undefined;

export async function getPathAFixtureScenarios(): Promise<PathAFixtureScenario[]> {
  if (!cachedPathAScenariosPromise) {
    cachedPathAScenariosPromise = buildPathAFixtureScenarios();
  }

  return cachedPathAScenariosPromise;
}

export async function getPathAFixtureScenario(
  id: string,
): Promise<PathAFixtureScenario | undefined> {
  const scenarios = await getPathAFixtureScenarios();
  return scenarios.find((scenario) => scenario.id === id);
}

export async function getPathAV3FixtureScenarios(): Promise<PathAV3FixtureScenario[]> {
  if (!cachedPathAV3ScenariosPromise) {
    cachedPathAV3ScenariosPromise = buildPathAV3FixtureScenarios();
  }

  return cachedPathAV3ScenariosPromise;
}

export async function getPathAV3FixtureScenario(
  id: string,
): Promise<PathAV3FixtureScenario | undefined> {
  const scenarios = await getPathAV3FixtureScenarios();
  return scenarios.find((scenario) => scenario.id === id);
}

export function evaluatePathAFixtureScenario(
  scenario: PathAFixtureScenario,
): PreparedMigrationState {
  return resolvePreparedMigration({
    oldPubkey: scenario.oldPubkey,
    events: scenario.events,
    otsProofs: scenario.otsProofs,
  });
}

export function evaluatePathAV3FixtureScenario(
  scenario: PathAV3FixtureScenario,
): PreparedMigrationV3State {
  return resolvePreparedMigrationV3({
    oldPubkey: scenario.oldPubkey,
    events: scenario.events,
    proofs: summarizeLegacyOtsProofs(scenario.otsProofs),
  });
}

export async function getPathCFixtureScenarios(): Promise<PathCFixtureScenario[]> {
  if (!cachedPathCScenariosPromise) {
    cachedPathCScenariosPromise = buildPathCFixtureScenarios();
  }

  return cachedPathCScenariosPromise;
}

export async function getPathCFixtureScenario(
  id: string,
): Promise<PathCFixtureScenario | undefined> {
  const scenarios = await getPathCFixtureScenarios();
  return scenarios.find((scenario) => scenario.id === id);
}

export function getDemoSecretKeyForPubkey(pubkey: string): string | undefined {
  return SECRET_KEY_BY_PUBKEY.get(pubkey);
}

export function evaluatePathCFixtureScenario(
  scenario: PathCFixtureScenario,
): Promise<SocialTransitionState> {
  return resolveSocialTransition({
    viewerFollowSet: new Set(scenario.viewerFollowPubkeys),
    oldPubkey: scenario.oldPubkey,
    newPubkey: scenario.newPubkey,
    claims: scenario.claims,
    attestations: scenario.attestations,
  });
}

function buildPathAFixtureScenarios(): Promise<PathAFixtureScenario[]> {
  return Promise.all([
    buildPendingOtsScenario(),
    buildRealConfirmedPmaScenario(),
    buildConfirmedAuthorityScenario(),
    buildConflictRootsScenario(),
    buildConflictChildrenScenario(),
    buildExecutedHappyPathScenario(),
    buildConflictExecutionScenario(),
  ]);
}

function buildPathCFixtureScenarios(): Promise<PathCFixtureScenario[]> {
  return Promise.all([
    buildClaimOnlySocialScenario(),
    buildSociallySupportedScenario(),
    buildSociallySplitScenario(),
    buildSelfAssertedNoiseScenario(),
  ]);
}

async function buildV3PendingOtsScenario(): Promise<PathAV3FixtureScenario> {
  const pma = await buildPmaV3({
    oldSigner: createFakeSigner(OLD_PUBKEY, "v3-pending-root"),
    migrationPubkey: MIGRATION_PUBKEY,
    createdAt: 1_800_000_000,
  });

  return {
    id: "v3-pending-ots",
    title: "V3 Pending OTS",
    summary: "A v3 PMA without a Bitcoin-confirmed proof does not become valid Prepared Migration evidence.",
    notes: [
      "The v3 resolver is validity-only and does not expose a pending state.",
      "This scenario stays at none until a Bitcoin-confirmed proof exists.",
    ],
    oldPubkey: OLD_PUBKEY,
    events: [pma],
    otsProofs: [createOtsProof(pma, { id: "1".repeat(64), kind: PMA_KIND })],
    expectedState: { state: "none" },
  };
}

async function buildV3PreparedEnrolledScenario(): Promise<PathAV3FixtureScenario> {
  const rootA = await buildPmaV3({
    oldSigner: createFakeSigner(OLD_PUBKEY, "v3-root-a"),
    migrationPubkey: MIGRATION_PUBKEY,
    createdAt: 1_800_000_100,
  });
  const rootB = await buildPmaV3({
    oldSigner: createFakeSigner(OLD_PUBKEY, "v3-root-b"),
    migrationPubkey: MIGRATION_PUBKEY,
    createdAt: 1_800_000_101,
  });
  const pmuA = await buildPmuV3({
    oldPubkey: OLD_PUBKEY,
    rootAuthorityId: rootA.id!,
    previousAuthorityId: rootA.id!,
    currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY, "v3-pmu-a"),
    nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
    oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "v3-pmu-a-old"),
    nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "v3-pmu-a-next"),
    createdAt: 1_800_000_120,
  });
  const pmuB = await buildPmuV3({
    oldPubkey: OLD_PUBKEY,
    rootAuthorityId: rootB.id!,
    previousAuthorityId: rootB.id!,
    currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY, "v3-pmu-b"),
    nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
    oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "v3-pmu-b-old"),
    nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "v3-pmu-b-next"),
    createdAt: 1_800_000_121,
  });

  const expectedRootCanonicalId = [rootA.id!, rootB.id!].sort()[0]!;
  const expectedAuthorityCanonicalId = [pmuA.id!, pmuB.id!].sort()[0]!;

  return {
    id: "v3-prepared-enrolled",
    title: "V3 Prepared Enrolled",
    summary: "Duplicate v3 PMAs and PMUs collapse into one active prepared authority.",
    notes: [
      "The root group is keyed by (O, M).",
      "Both PMU children advance to the same next migration key and collapse semantically.",
    ],
    oldPubkey: OLD_PUBKEY,
    events: [rootA, rootB, pmuA, pmuB],
    otsProofs: [
      createOtsProof(rootA, { id: "2".repeat(64), kind: PMA_KIND, anchorHeight: 850_000 }),
      createOtsProof(rootB, { id: "3".repeat(64), kind: PMA_KIND, anchorHeight: 850_000 }),
      createOtsProof(pmuA, { id: "4".repeat(64), kind: PMU_KIND, anchorHeight: 850_001 }),
      createOtsProof(pmuB, { id: "5".repeat(64), kind: PMU_KIND, anchorHeight: 850_001 }),
    ],
    expectedState: {
      state: "prepared_enrolled",
      root: {
        canonicalAuthorityId: expectedRootCanonicalId,
        authorityIds: [rootA.id!, rootB.id!].sort(),
        oldPubkey: OLD_PUBKEY,
        migrationPubkey: MIGRATION_PUBKEY,
        anchorHeight: 850_000,
      },
      activeAuthority: {
        canonicalAuthorityId: expectedAuthorityCanonicalId,
        authorityIds: [pmuA.id!, pmuB.id!].sort(),
        rootAuthorityCanonicalId: expectedRootCanonicalId,
        oldPubkey: OLD_PUBKEY,
        migrationPubkey: NEXT_MIGRATION_PUBKEY,
        anchorHeight: 850_001,
      },
    },
  };
}

async function buildV3PreparedMigratedScenario(): Promise<PathAV3FixtureScenario> {
  const root = await buildPmaV3({
    oldSigner: createFakeSigner(OLD_PUBKEY, "v3-exec-root"),
    migrationPubkey: MIGRATION_PUBKEY,
    createdAt: 1_800_000_200,
  });
  const pmu = await buildPmuV3({
    oldPubkey: OLD_PUBKEY,
    rootAuthorityId: root.id!,
    previousAuthorityId: root.id!,
    currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY, "v3-exec-pmu"),
    nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
    oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "v3-exec-old"),
    nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "v3-exec-next"),
    createdAt: 1_800_000_220,
  });
  const stalePmx = await buildPmxV3({
    rootAuthorityId: root.id!,
    authorityId: root.id!,
    oldPubkey: OLD_PUBKEY,
    migrationSigner: createFakeSigner(MIGRATION_PUBKEY, "v3-stale-mig"),
    newSigner: createFakeSigner(OTHER_NEW_PUBKEY, "v3-stale-new"),
    createdAt: 1_800_000_230,
  });
  const pmx = await buildPmxV3({
    rootAuthorityId: root.id!,
    authorityId: pmu.id!,
    oldPubkey: OLD_PUBKEY,
    migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY, "v3-pmx-mig"),
    newSigner: createFakeSigner(NEW_PUBKEY, "v3-pmx-new"),
    createdAt: 1_800_000_240,
  });

  return {
    id: "v3-prepared-migrated",
    title: "V3 Prepared Migrated",
    summary: "One active v3 PMX successor remains after a stale execution is ignored.",
    notes: [
      "The PMX that references the stale root authority must be ignored.",
      "Only the PMX pointing to the active authority set counts.",
    ],
    oldPubkey: OLD_PUBKEY,
    events: [root, pmu, stalePmx, pmx],
    otsProofs: [
      createOtsProof(root, { id: "6".repeat(64), kind: PMA_KIND, anchorHeight: 850_010 }),
      createOtsProof(pmu, { id: "7".repeat(64), kind: PMU_KIND, anchorHeight: 850_011 }),
    ],
    expectedState: {
      state: "prepared_migrated",
      root: {
        canonicalAuthorityId: root.id!,
        authorityIds: [root.id!],
        oldPubkey: OLD_PUBKEY,
        migrationPubkey: MIGRATION_PUBKEY,
        anchorHeight: 850_010,
      },
      activeAuthority: {
        canonicalAuthorityId: pmu.id!,
        authorityIds: [pmu.id!],
        rootAuthorityCanonicalId: root.id!,
        oldPubkey: OLD_PUBKEY,
        migrationPubkey: NEXT_MIGRATION_PUBKEY,
        anchorHeight: 850_011,
      },
      execution: {
        canonicalExecutionId: pmx.id!,
        executionIds: [pmx.id!],
        newPubkey: NEW_PUBKEY,
      },
      newPubkey: NEW_PUBKEY,
    },
  };
}

async function buildV3ConflictingRootsScenario(): Promise<PathAV3FixtureScenario> {
  const rootA = await buildPmaV3({
    oldSigner: createFakeSigner(OLD_PUBKEY, "v3-conf-root-a"),
    migrationPubkey: MIGRATION_PUBKEY,
    createdAt: 1_800_000_300,
  });
  const rootB = await buildPmaV3({
    oldSigner: createFakeSigner(OLD_PUBKEY, "v3-conf-root-b"),
    migrationPubkey: OTHER_MIGRATION_PUBKEY,
    createdAt: 1_800_000_301,
  });

  return {
    id: "v3-conflicting-roots",
    title: "V3 Conflicting Roots",
    summary: "Two distinct v3 PMA root groups share the earliest anchor height.",
    notes: [
      "The lexicographic tie-break is only for duplicates inside one group.",
      "Different migration keys at the same earliest anchor remain conflicting roots.",
    ],
    oldPubkey: OLD_PUBKEY,
    events: [rootA, rootB],
    otsProofs: [
      createOtsProof(rootA, { id: "8".repeat(64), kind: PMA_KIND, anchorHeight: 850_020 }),
      createOtsProof(rootB, { id: "9".repeat(64), kind: PMA_KIND, anchorHeight: 850_020 }),
    ],
    expectedState: {
      state: "conflicting_roots",
      anchorHeight: 850_020,
      roots: [
        {
          canonicalAuthorityId: rootA.id!,
          authorityIds: [rootA.id!],
          oldPubkey: OLD_PUBKEY,
          migrationPubkey: MIGRATION_PUBKEY,
          anchorHeight: 850_020,
        },
        {
          canonicalAuthorityId: rootB.id!,
          authorityIds: [rootB.id!],
          oldPubkey: OLD_PUBKEY,
          migrationPubkey: OTHER_MIGRATION_PUBKEY,
          anchorHeight: 850_020,
        },
      ],
    },
  };
}

async function buildV3ConflictingAuthorityUpdatesScenario(): Promise<PathAV3FixtureScenario> {
  const root = await buildPmaV3({
    oldSigner: createFakeSigner(OLD_PUBKEY, "v3-child-root"),
    migrationPubkey: MIGRATION_PUBKEY,
    createdAt: 1_800_000_400,
  });
  const childA = await buildPmuV3({
    oldPubkey: OLD_PUBKEY,
    rootAuthorityId: root.id!,
    previousAuthorityId: root.id!,
    currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY, "v3-child-a"),
    nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
    oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "v3-child-a-old"),
    nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "v3-child-a-next"),
    createdAt: 1_800_000_410,
  });
  const childB = await buildPmuV3({
    oldPubkey: OLD_PUBKEY,
    rootAuthorityId: root.id!,
    previousAuthorityId: root.id!,
    currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY, "v3-child-b"),
    nextMigrationPubkey: OTHER_MIGRATION_PUBKEY,
    oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "v3-child-b-old"),
    nextDetachedSigner: createFakeDetachedSigner(OTHER_MIGRATION_PUBKEY, "v3-child-b-next"),
    createdAt: 1_800_000_411,
  });

  return {
    id: "v3-conflicting-authority-updates",
    title: "V3 Conflicting Authority Updates",
    summary: "Two distinct next migration keys remain after v3 PMU grouping.",
    notes: [
      "Both children reference the same root group and current authority set.",
      "Distinct next migration keys create a semantic fork.",
    ],
    oldPubkey: OLD_PUBKEY,
    events: [root, childA, childB],
    otsProofs: [
      createOtsProof(root, { id: "a".repeat(64), kind: PMA_KIND, anchorHeight: 850_030 }),
      createOtsProof(childA, { id: "b".repeat(64), kind: PMU_KIND, anchorHeight: 850_031 }),
      createOtsProof(childB, { id: "c".repeat(64), kind: PMU_KIND, anchorHeight: 850_032 }),
    ],
    expectedState: {
      state: "conflicting_authority_updates",
      root: {
        canonicalAuthorityId: root.id!,
        authorityIds: [root.id!],
        oldPubkey: OLD_PUBKEY,
        migrationPubkey: MIGRATION_PUBKEY,
        anchorHeight: 850_030,
      },
      activeAuthority: {
        canonicalAuthorityId: root.id!,
        authorityIds: [root.id!],
        rootAuthorityCanonicalId: root.id!,
        oldPubkey: OLD_PUBKEY,
        migrationPubkey: MIGRATION_PUBKEY,
        anchorHeight: 850_030,
      },
      conflictingAuthorities: [
        {
          canonicalAuthorityId: childA.id!,
          authorityIds: [childA.id!],
          rootAuthorityCanonicalId: root.id!,
          oldPubkey: OLD_PUBKEY,
          migrationPubkey: NEXT_MIGRATION_PUBKEY,
          anchorHeight: 850_031,
        },
        {
          canonicalAuthorityId: childB.id!,
          authorityIds: [childB.id!],
          rootAuthorityCanonicalId: root.id!,
          oldPubkey: OLD_PUBKEY,
          migrationPubkey: OTHER_MIGRATION_PUBKEY,
          anchorHeight: 850_032,
        },
      ],
    },
  };
}

async function buildV3ConflictingExecutionsScenario(): Promise<PathAV3FixtureScenario> {
  const root = await buildPmaV3({
    oldSigner: createFakeSigner(OLD_PUBKEY, "v3-ex-conf-root"),
    migrationPubkey: MIGRATION_PUBKEY,
    createdAt: 1_800_000_500,
  });
  const pmu = await buildPmuV3({
    oldPubkey: OLD_PUBKEY,
    rootAuthorityId: root.id!,
    previousAuthorityId: root.id!,
    currentMigrationSigner: createFakeSigner(MIGRATION_PUBKEY, "v3-ex-conf-pmu"),
    nextMigrationPubkey: NEXT_MIGRATION_PUBKEY,
    oldDetachedSigner: createFakeDetachedSigner(OLD_PUBKEY, "v3-ex-conf-old"),
    nextDetachedSigner: createFakeDetachedSigner(NEXT_MIGRATION_PUBKEY, "v3-ex-conf-next"),
    createdAt: 1_800_000_510,
  });
  const pmxA = await buildPmxV3({
    rootAuthorityId: root.id!,
    authorityId: pmu.id!,
    oldPubkey: OLD_PUBKEY,
    migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY, "v3-ex-conf-a"),
    newSigner: createFakeSigner(NEW_PUBKEY, "v3-ex-conf-new-a"),
    createdAt: 1_800_000_520,
  });
  const pmxB = await buildPmxV3({
    rootAuthorityId: root.id!,
    authorityId: pmu.id!,
    oldPubkey: OLD_PUBKEY,
    migrationSigner: createFakeSigner(NEXT_MIGRATION_PUBKEY, "v3-ex-conf-b"),
    newSigner: createFakeSigner(OTHER_NEW_PUBKEY, "v3-ex-conf-new-b"),
    createdAt: 1_800_000_521,
  });

  return {
    id: "v3-conflicting-executions",
    title: "V3 Conflicting Executions",
    summary: "Two distinct successor keys remain after v3 PMX grouping.",
    notes: [
      "Both PMXs reference the same active authority set.",
      "Different successor pubkeys remain unresolved conflict.",
    ],
    oldPubkey: OLD_PUBKEY,
    events: [root, pmu, pmxA, pmxB],
    otsProofs: [
      createOtsProof(root, { id: "d".repeat(64), kind: PMA_KIND, anchorHeight: 850_040 }),
      createOtsProof(pmu, { id: "e".repeat(64), kind: PMU_KIND, anchorHeight: 850_041 }),
    ],
    expectedState: {
      state: "conflicting_executions",
      root: {
        canonicalAuthorityId: root.id!,
        authorityIds: [root.id!],
        oldPubkey: OLD_PUBKEY,
        migrationPubkey: MIGRATION_PUBKEY,
        anchorHeight: 850_040,
      },
      activeAuthority: {
        canonicalAuthorityId: pmu.id!,
        authorityIds: [pmu.id!],
        rootAuthorityCanonicalId: root.id!,
        oldPubkey: OLD_PUBKEY,
        migrationPubkey: NEXT_MIGRATION_PUBKEY,
        anchorHeight: 850_041,
      },
      conflictingExecutions: [
        {
          canonicalExecutionId: pmxA.id!,
          executionIds: [pmxA.id!],
          newPubkey: NEW_PUBKEY,
        },
        {
          canonicalExecutionId: pmxB.id!,
          executionIds: [pmxB.id!],
          newPubkey: OTHER_NEW_PUBKEY,
        },
      ],
    },
  };
}

function buildPathAV3FixtureScenarios(): Promise<PathAV3FixtureScenario[]> {
  return Promise.all([
    buildV3PendingOtsScenario(),
    buildV3PreparedEnrolledScenario(),
    buildV3PreparedMigratedScenario(),
    buildV3ConflictingRootsScenario(),
    buildV3ConflictingAuthorityUpdatesScenario(),
    buildV3ConflictingExecutionsScenario(),
  ]);
}

async function buildPendingOtsScenario(): Promise<PathAFixtureScenario> {
  const corpus = requireRealCorpusItem("real-pma-pending");

  return {
    id: "pending-ots",
    title: "Pending OTS",
    summary:
      "Signed PMA published with real helper-verified proof bytes, but the 1040 proof is still pending and not valid Path A authority.",
    notes: [
      "This scenario now reuses the shared real pending PMA corpus item.",
      "Local onboarding is past draft but not yet Bitcoin confirmed.",
      "The resolver should stay in published_pending_ots.",
    ],
    proofBacking: "real_helper_verified",
    realOtsCorpusId: corpus.id,
    realOtsCorpusIds: [corpus.id],
    oldPubkey: corpus.authorityEvent.pubkey,
    events: [corpus.authorityEvent],
    otsProofs: [corpus.proofEvent],
    expectedState: { state: "published_pending_ots" },
  };
}

function buildRealConfirmedPmaScenario(): Promise<PathAFixtureScenario> {
  const corpus = requireRealCorpusItem("real-pma-confirmed");
  const confirmedProof = buildVerifiedProofEvent(corpus);

  return Promise.resolve({
    id: "real-confirmed-pma",
    title: "Real Confirmed PMA",
    summary:
      "One PMA and one shared real helper-verified 1040 proof resolve to confirmed authority through the current PoC metadata bridge.",
    notes: [
      "This scenario reuses the shared real confirmed PMA corpus item.",
      "The proof bytes are real, but protocol confirmation still uses the local x-verified-anchor-height bridge.",
      "This is the simplest confirmed real-backed Path A walkthrough.",
    ],
    proofBacking: "real_helper_verified",
    realOtsCorpusId: corpus.id,
    realOtsCorpusIds: [corpus.id],
    oldPubkey: corpus.authorityEvent.pubkey,
    events: [corpus.authorityEvent],
    otsProofs: [confirmedProof],
    expectedState: {
      state: "bitcoin_confirmed",
      authorityId: corpus.authorityEvent.id!,
    },
  });
}

async function buildConfirmedAuthorityScenario(): Promise<PathAFixtureScenario> {
  const rootA = buildRealConfirmedRootAuthority("real-pma-confirmed");
  const rootB = buildRealConfirmedRootAuthority("real-pma-confirmed-duplicate");
  const pmuA = buildRealConfirmedPmuAuthority("real-pmu-confirmed-chain");
  const pmuB = buildRealConfirmedPmuAuthority("real-pmu-confirmed-duplicate");

  return {
    id: "confirmed-authority",
    title: "Confirmed Authority",
    summary:
      "Two real duplicate confirmed PMA roots and two real duplicate confirmed PMU children collapse into one active confirmed authority.",
    notes: [
      "Both PMA roots are helper-verifiable real proof pairs with the same semantic migration target.",
      "Both PMU children are helper-verifiable real proof pairs with the same semantic next migration key.",
      "Duplicate normalization should collapse both layers before fork detection.",
    ],
    proofBacking: "real_helper_verified",
    realOtsCorpusId: rootA.id,
    realOtsCorpusIds: [rootA.id, rootB.id, pmuA.id, pmuB.id],
    oldPubkey: OLD_PUBKEY,
    events: [rootA.authorityEvent, rootB.authorityEvent, pmuA.authorityEvent, pmuB.authorityEvent],
    otsProofs: [rootA.proofEvent, rootB.proofEvent, pmuA.proofEvent, pmuB.proofEvent],
    expectedState: { state: "bitcoin_confirmed", authorityId: pmuA.authorityEvent.id! },
  };
}

async function buildExecutedHappyPathScenario(): Promise<PathAFixtureScenario> {
  const { root, pmu, realCorpusIds } = await createConfirmedAuthorityChain();
  const staleExecution = await buildPmx({
    authorityId: root.authorityEvent.id!,
    oldPubkey: OLD_PUBKEY,
    migrationSigner: createFakeSigner(getSingleTagValue(pmu.authorityEvent, "u")!, "stale-mig"),
    newSigner: createFakeSigner(OTHER_NEW_PUBKEY, "stale-new"),
    createdAt: 1_700_000_320,
  });
  const executed = await buildPmx({
    authorityId: pmu.authorityEvent.id!,
    oldPubkey: OLD_PUBKEY,
    migrationSigner: createFakeSigner(getSingleTagValue(pmu.authorityEvent, "u")!, "exec-mig"),
    newSigner: createFakeSigner(NEW_PUBKEY, "exec-new"),
    createdAt: 1_700_000_456,
  });

  return {
    id: "executed-happy-path",
    title: "Executed Happy Path",
    summary: "The active authority executes to one successor key while stale-authority PMXs are ignored.",
    notes: [
      "The confirmed PMA root and confirmed PMU authority both come from the shared real corpus.",
      "The PMX referencing the stale PMA authority is intentionally present and should be ignored.",
      "One distinct PMX successor remains, so the resolver should return executed.",
    ],
    proofBacking: "real_helper_verified",
    realOtsCorpusId: realCorpusIds[0],
    realOtsCorpusIds: realCorpusIds,
    oldPubkey: OLD_PUBKEY,
    events: [root.authorityEvent, pmu.authorityEvent, staleExecution, executed],
    otsProofs: [root.proofEvent, pmu.proofEvent],
    expectedState: {
      state: "executed",
      authorityId: pmu.authorityEvent.id!,
      newPubkey: NEW_PUBKEY,
    },
  };
}

async function buildConflictRootsScenario(): Promise<PathAFixtureScenario> {
  const rootA = buildRealConfirmedRootAuthority("real-pma-confirmed");
  const rootB = buildRealConfirmedRootAuthority("real-pma-confirmed-conflict");

  return {
    id: "conflicting-roots",
    title: "Conflicting Roots",
    summary:
      "Two distinct confirmed PMA roots share the earliest anchor height, so Path A cannot choose one starting authority.",
    notes: [
      "Both roots are helper-verifiable real PMA plus `.ots` proof pairs.",
      "The roots use different migration keys, so duplicate normalization does not collapse them.",
      "Root conflicts are plural by definition and should not expose one chosen authority id.",
    ],
    proofBacking: "real_helper_verified",
    realOtsCorpusId: rootA.id,
    realOtsCorpusIds: [rootA.id, rootB.id],
    oldPubkey: OLD_PUBKEY,
    events: [rootA.authorityEvent, rootB.authorityEvent],
    otsProofs: [rootA.proofEvent, rootB.proofEvent],
    expectedState: {
      state: "conflict",
      conflictKind: "multiple_roots",
      anchorHeight: rootA.anchorHeight,
      authorityIds: [rootA.authorityEvent.id!, rootB.authorityEvent.id!],
      reason: `multiple confirmed PMA roots share anchor height ${rootA.anchorHeight}`,
    },
  };
}

async function buildConflictChildrenScenario(): Promise<PathAFixtureScenario> {
  const root = buildRealConfirmedRootAuthority("real-pma-confirmed");
  const childA = buildRealConfirmedPmuAuthority("real-pmu-confirmed-chain");
  const childB = buildRealConfirmedPmuAuthority("real-pmu-confirmed-conflict");

  return {
    id: "conflicting-children",
    title: "Conflicting Children",
    summary:
      "A real confirmed PMA root has two distinct confirmed real PMU children, so Path A cannot advance to one active authority.",
    notes: [
      "The root and both child authorities are helper-verifiable real proof pairs.",
      "Both children reference the same confirmed parent authority.",
      "The children diverge to different next migration keys, so the resolver must stay conflicted.",
    ],
    proofBacking: "real_helper_verified",
    realOtsCorpusId: root.id,
    realOtsCorpusIds: [root.id, childA.id, childB.id],
    oldPubkey: OLD_PUBKEY,
    events: [root.authorityEvent, childA.authorityEvent, childB.authorityEvent],
    otsProofs: [root.proofEvent, childA.proofEvent, childB.proofEvent],
    expectedState: {
      state: "conflict",
      conflictKind: "multiple_children",
      authorityId: root.authorityEvent.id!,
      conflictingAuthorityIds: [childA.authorityEvent.id!, childB.authorityEvent.id!],
      reason: `multiple confirmed PMU children reference authority ${root.authorityEvent.id!}`,
    },
  };
}

async function buildConflictExecutionScenario(): Promise<PathAFixtureScenario> {
  const { root, pmu, realCorpusIds } = await createConfirmedAuthorityChain();
  const executionA = await buildPmx({
    authorityId: pmu.authorityEvent.id!,
    oldPubkey: OLD_PUBKEY,
    migrationSigner: createFakeSigner(getSingleTagValue(pmu.authorityEvent, "u")!, "conflict-mig-a"),
    newSigner: createFakeSigner(NEW_PUBKEY, "conflict-new-a"),
    createdAt: 1_700_000_456,
  });
  const executionB = await buildPmx({
    authorityId: pmu.authorityEvent.id!,
    oldPubkey: OLD_PUBKEY,
    migrationSigner: createFakeSigner(getSingleTagValue(pmu.authorityEvent, "u")!, "conflict-mig-b"),
    newSigner: createFakeSigner(OTHER_NEW_PUBKEY, "conflict-new-b"),
    createdAt: 1_700_000_457,
  });

  return {
    id: "conflicting-executions",
    title: "Conflicting Executions",
    summary:
      "A real confirmed PMA root feeds one confirmed real PMU authority, but two distinct PMX successor keys still remain after normalization.",
    notes: [
      "The confirmed PMA root and confirmed PMU authority both come from the shared real corpus.",
      "Both PMXs reference the same active authority.",
      "Different successor keys mean the resolver must return conflict rather than pick one.",
    ],
    proofBacking: "real_helper_verified",
    realOtsCorpusId: realCorpusIds[0],
    realOtsCorpusIds: realCorpusIds,
    oldPubkey: OLD_PUBKEY,
    events: [root.authorityEvent, pmu.authorityEvent, executionA, executionB],
    otsProofs: [root.proofEvent, pmu.proofEvent],
    expectedState: {
      state: "conflict",
      conflictKind: "multiple_executions",
      authorityId: pmu.authorityEvent.id!,
      conflictingExecutionIds: [executionA.id!, executionB.id!],
      reason: `multiple confirmed PMX executions reference authority ${pmu.authorityEvent.id!}`,
    },
  };
}

async function buildClaimOnlySocialScenario(): Promise<PathCFixtureScenario> {
  const oldClaim = await buildSocialClaim({
    role: "old",
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    signer: createFakeSigner(SOCIAL_OLD_PUBKEY, "social-claim-old"),
    content: "old-key continuity claim",
    createdAt: 1_700_100_000,
  });
  const newClaim = await buildSocialClaim({
    role: "new",
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    signer: createFakeSigner(SOCIAL_NEW_PUBKEY, "social-claim-new"),
    content: "new-key continuity claim",
    createdAt: 1_700_100_001,
  });

  return {
    id: "claim-only",
    title: "Claim Only",
    summary: "First-party claims exist, but no followed third-party attestors have weighed in yet.",
    notes: [
      "Path C should remain advisory and non-cryptographic here.",
      "Without followed third-party support or opposition, the resolver stays in claimed.",
    ],
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    viewerFollowPubkeys: [SOCIAL_ATTESTOR_A],
    claims: [oldClaim, newClaim],
    attestations: [],
    expectedState: {
      state: "claimed",
      oldPubkey: SOCIAL_OLD_PUBKEY,
      newPubkey: SOCIAL_NEW_PUBKEY,
      claimIds: [oldClaim.id!, newClaim.id!],
      claimRoles: ["old", "new"],
      selfAssertedSupportPubkeys: [],
      selfAssertedOpposePubkeys: [],
    },
  };
}

async function buildSociallySupportedScenario(): Promise<PathCFixtureScenario> {
  const oldClaim = await buildSocialClaim({
    role: "old",
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    signer: createFakeSigner(SOCIAL_OLD_PUBKEY, "social-support-claim"),
    createdAt: 1_700_100_100,
  });
  const thirdPartySupport = await buildSocialAttestation({
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    attestorSigner: createFakeSigner(SOCIAL_ATTESTOR_A, "social-support-attestor"),
    stance: "support",
    method: "video",
    referencedClaimIds: [oldClaim.id!],
    createdAt: 1_700_100_120,
  });
  const selfSupport = await buildSocialAttestation({
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    attestorSigner: createFakeSigner(SOCIAL_NEW_PUBKEY, "social-support-self"),
    stance: "support",
    referencedClaimIds: [oldClaim.id!],
    createdAt: 1_700_100_121,
  });

  return {
    id: "socially-supported",
    title: "Socially Supported",
    summary: "A followed third party supports the transition while a self-asserted STA stays separate.",
    notes: [
      "Support from the new key is valid evidence but does not count as independent third-party support.",
      "One followed third-party support is enough to reach socially_supported in the PoC.",
    ],
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    viewerFollowPubkeys: [SOCIAL_ATTESTOR_A, SOCIAL_NEW_PUBKEY],
    claims: [oldClaim],
    attestations: [thirdPartySupport, selfSupport],
    expectedState: {
      state: "socially_supported",
      oldPubkey: SOCIAL_OLD_PUBKEY,
      newPubkey: SOCIAL_NEW_PUBKEY,
      claimIds: [oldClaim.id!],
      claimRoles: ["old"],
      supportPubkeys: [SOCIAL_ATTESTOR_A],
      selfAssertedSupportPubkeys: [SOCIAL_NEW_PUBKEY],
      selfAssertedOpposePubkeys: [],
    },
  };
}

async function buildSociallySplitScenario(): Promise<PathCFixtureScenario> {
  const oldClaim = await buildSocialClaim({
    role: "old",
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    signer: createFakeSigner(SOCIAL_OLD_PUBKEY, "social-split-old"),
    createdAt: 1_700_100_200,
  });
  const newClaim = await buildSocialClaim({
    role: "new",
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    signer: createFakeSigner(SOCIAL_NEW_PUBKEY, "social-split-new"),
    createdAt: 1_700_100_201,
  });
  const olderSupport = await buildSocialAttestation({
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    attestorSigner: createFakeSigner(SOCIAL_ATTESTOR_A, "social-split-support-old"),
    stance: "support",
    referencedClaimIds: [oldClaim.id!, newClaim.id!],
    createdAt: 1_700_100_220,
  });
  const newerOppose = await buildSocialAttestation({
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    attestorSigner: createFakeSigner(SOCIAL_ATTESTOR_A, "social-split-oppose-new"),
    stance: "oppose",
    referencedClaimIds: [oldClaim.id!, newClaim.id!],
    createdAt: 1_700_100_260,
  });
  const secondSupport = await buildSocialAttestation({
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    attestorSigner: createFakeSigner(SOCIAL_ATTESTOR_B, "social-split-support-live"),
    stance: "support",
    method: "chat",
    referencedClaimIds: [newClaim.id!],
    createdAt: 1_700_100_240,
  });

  return {
    id: "socially-split",
    title: "Socially Split",
    summary: "Two followed attestors disagree after live-attestation supersession is applied.",
    notes: [
      "The older support from attestor A is superseded by attestor A's later oppose stance.",
      "Attestor B still supports, so the local view becomes socially_split.",
    ],
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    viewerFollowPubkeys: [SOCIAL_ATTESTOR_A, SOCIAL_ATTESTOR_B],
    claims: [oldClaim, newClaim],
    attestations: [olderSupport, newerOppose, secondSupport],
    expectedState: {
      state: "socially_split",
      oldPubkey: SOCIAL_OLD_PUBKEY,
      newPubkey: SOCIAL_NEW_PUBKEY,
      claimIds: [oldClaim.id!, newClaim.id!],
      claimRoles: ["old", "new"],
      supportPubkeys: [SOCIAL_ATTESTOR_B],
      opposePubkeys: [SOCIAL_ATTESTOR_A],
      selfAssertedSupportPubkeys: [],
      selfAssertedOpposePubkeys: [],
    },
  };
}

async function buildSelfAssertedNoiseScenario(): Promise<PathCFixtureScenario> {
  const oldClaim = await buildSocialClaim({
    role: "old",
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    signer: createFakeSigner(SOCIAL_OLD_PUBKEY, "social-noise-claim"),
    createdAt: 1_700_100_300,
  });
  const oldSelfSupport = await buildSocialAttestation({
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    attestorSigner: createFakeSigner(SOCIAL_OLD_PUBKEY, "social-noise-old"),
    stance: "support",
    referencedClaimIds: [oldClaim.id!],
    createdAt: 1_700_100_320,
  });
  const newSelfOppose = await buildSocialAttestation({
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    attestorSigner: createFakeSigner(SOCIAL_NEW_PUBKEY, "social-noise-new"),
    stance: "oppose",
    referencedClaimIds: [oldClaim.id!],
    createdAt: 1_700_100_321,
  });

  return {
    id: "self-asserted-noise",
    title: "Self-Asserted Noise",
    summary: "Self-authored STAs remain visible evidence but do not create independent support or opposition.",
    notes: [
      "This scenario demonstrates the anti-noise posture for first-party social evidence.",
      "The resolver should stay in claimed while still surfacing the self-asserted support and opposition.",
    ],
    oldPubkey: SOCIAL_OLD_PUBKEY,
    newPubkey: SOCIAL_NEW_PUBKEY,
    viewerFollowPubkeys: [SOCIAL_OLD_PUBKEY, SOCIAL_NEW_PUBKEY, SOCIAL_ATTESTOR_A],
    claims: [oldClaim],
    attestations: [oldSelfSupport, newSelfOppose],
    expectedState: {
      state: "claimed",
      oldPubkey: SOCIAL_OLD_PUBKEY,
      newPubkey: SOCIAL_NEW_PUBKEY,
      claimIds: [oldClaim.id!],
      claimRoles: ["old"],
      selfAssertedSupportPubkeys: [SOCIAL_OLD_PUBKEY],
      selfAssertedOpposePubkeys: [SOCIAL_NEW_PUBKEY],
    },
  };
}

async function createConfirmedAuthorityChain() {
  const root = buildRealConfirmedRootAuthority("real-pma-confirmed");
  const pmu = buildRealConfirmedPmuAuthority("real-pmu-confirmed-chain");

  return { root, pmu, realCorpusIds: [root.id, pmu.id] };
}

function buildRealConfirmedRootAuthority(corpusId: string) {
  const corpus = requireRealCorpusItem(corpusId);
  if (corpus.authorityEvent.kind !== PMA_KIND) {
    throw new Error(`real corpus item ${corpusId} is not a PMA authority`);
  }

  const migrationPubkey = getSingleTagValue(corpus.authorityEvent, "m");
  const anchorHeight = corpus.expectedAnchorHeight;

  if (!migrationPubkey) {
    throw new Error("real confirmed PMA corpus item is missing its m tag");
  }
  if (anchorHeight === undefined) {
    throw new Error("real confirmed PMA corpus item is missing its expected anchor height");
  }

  return {
    id: corpus.id,
    authorityEvent: {
      ...corpus.authorityEvent,
      tags: corpus.authorityEvent.tags.map((tag) => [...tag]),
    },
    proofEvent: buildVerifiedProofEvent(corpus),
    migrationPubkey,
    anchorHeight,
  };
}

function buildRealConfirmedPmuAuthority(corpusId: string) {
  const corpus = requireRealCorpusItem(corpusId);
  if (corpus.authorityEvent.kind !== PMU_KIND) {
    throw new Error(`real corpus item ${corpusId} is not a PMU authority`);
  }

  const anchorHeight = corpus.expectedAnchorHeight;
  if (anchorHeight === undefined) {
    throw new Error(`real confirmed PMU corpus item ${corpusId} is missing its expected anchor height`);
  }

  return {
    id: corpus.id,
    authorityEvent: {
      ...corpus.authorityEvent,
      tags: corpus.authorityEvent.tags.map((tag) => [...tag]),
    },
    proofEvent: buildVerifiedProofEvent(corpus),
    anchorHeight,
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

function requireRealCorpusItem(id: string): PathARealOtsCorpusItem {
  const item = getPathARealOtsCorpusItem(id);
  if (!item) {
    throw new Error(`missing real Path A OTS corpus item ${id}`);
  }

  return item;
}

function getSecretKeyForPubkey(pubkey: string): string {
  const secretKeyHex = SECRET_KEY_BY_PUBKEY.get(pubkey);
  if (!secretKeyHex) {
    throw new Error(`missing secret key for pubkey ${pubkey}`);
  }

  return secretKeyHex;
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

function buildVerifiedProofEvent(corpus: PathARealOtsCorpusItem): NostrEvent {
  if (corpus.expectedAnchorHeight === undefined) {
    throw new Error(`real corpus item ${corpus.id} is missing its expected anchor height`);
  }

  return {
    ...corpus.proofEvent,
    tags: [
      ...corpus.proofEvent.tags.map((tag) => [...tag]),
      [VERIFIED_ANCHOR_HEIGHT_TAG, String(corpus.expectedAnchorHeight)],
    ],
  };
}

const SECRET_KEY_BY_PUBKEY = new Map<string, string>([
  [OLD_PUBKEY, OLD_SECRET_KEY],
  [MIGRATION_PUBKEY, MIGRATION_SECRET_KEY],
  [NEXT_MIGRATION_PUBKEY, NEXT_MIGRATION_SECRET_KEY],
  [OTHER_MIGRATION_PUBKEY, OTHER_MIGRATION_SECRET_KEY],
  [NEW_PUBKEY, NEW_SECRET_KEY],
  [OTHER_NEW_PUBKEY, OTHER_NEW_SECRET_KEY],
  [SOCIAL_OLD_PUBKEY, SOCIAL_OLD_SECRET_KEY],
  [SOCIAL_NEW_PUBKEY, SOCIAL_NEW_SECRET_KEY],
  [SOCIAL_ATTESTOR_A, SOCIAL_ATTESTOR_A_SECRET_KEY],
  [SOCIAL_ATTESTOR_B, SOCIAL_ATTESTOR_B_SECRET_KEY],
]);
