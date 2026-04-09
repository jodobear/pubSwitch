import { describe, expect, test } from "bun:test";
import { buildProtocolCliHelpText } from "./protocol-cli-help";
import {
  advisePreparedMigration,
  buildBundlePublishPlan,
  buildBundleSubscriptionFilters,
  cliOperateTransition,
  buildPreparedBundleFromScenario,
  buildPreparedPublishPlan,
  buildPreparedBundleSubscriptionFilters,
  buildSocialBundleFromScenario,
  buildSocialPublishPlan,
  buildSocialBundleSubscriptionFilters,
  cliAttachPreparedProof,
  cliContinuePreparedMigration,
  cliCreateSocialAttestation,
  cliCreateSocialClaim,
  cliExecute,
  cliInspectTransition,
  cliPrepare,
  cliPublishBundle,
  cliRunPreparedMigrationFlow,
  formatInspectResult,
  listPreparedSnapshotNamesDescending,
  listSocialSnapshotNamesDescending,
  resolveSocialTransitionPubkeys,
  selectLatestPreparedSnapshotName,
  selectLatestSocialSnapshotName,
  summarizePreparedWorkflow,
  summarizeSocialWorkflow,
  summarizePreparedMigrationRelayReport,
  cliUpdateAuthority,
} from "./protocol-cli-lib";
import { buildPreparedBundle } from "../packages/evidence-bundles/src/index";
import { deriveSchnorrPublicKey } from "../packages/protocol-shared/src/index";
import { getPathAV3FixtureScenario, getPathCFixtureScenario } from "../packages/fixtures/src/index";
import { summarizeOtsProofEventForV3 } from "../apps/ots-helper/src/real-inspect";
import type { NostrEvent } from "../packages/protocol-shared/src/index";
import type { RelayReceipt, RelaySession } from "./relay-runtime";

const OLD_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000021";
const MIGRATION_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000022";
const NEXT_MIGRATION_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000023";
const NEW_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000024";
const ATTESTOR_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000025";

function createFakeRelayRuntime(input: {
  relays?: string[];
  observedEvents?: NostrEvent[];
  publishEvent?: (session: RelaySession, event: NostrEvent) => Promise<RelayReceipt[]> | RelayReceipt[];
}) {
  const relays = input.relays ?? ["wss://relay.test.one", "wss://relay.test.two"];
  return {
    async openRelaySession(args: {
      relays?: string[];
      onEvent?: (event: NostrEvent) => void | Promise<void>;
    }): Promise<RelaySession> {
      const session: RelaySession = {
        relays: args.relays && args.relays.length > 0 ? args.relays : relays,
        sockets: new Map(),
        statuses: new Map(),
        receipts: [],
        seenEventIds: new Set((input.observedEvents ?? []).map((event) => event.id!).filter(Boolean)),
        observedEvents: [...(input.observedEvents ?? [])],
        close() {},
      };

      for (const event of input.observedEvents ?? []) {
        await args.onEvent?.(event);
      }

      return session;
    },
    async publishEvent(session: RelaySession, event: NostrEvent): Promise<RelayReceipt[]> {
      if (input.publishEvent) {
        const receipts = await input.publishEvent(session, event);
        session.receipts.unshift(...receipts);
        return receipts;
      }
      const receipts = session.relays.map((relayUrl) => ({
        eventId: event.id!,
        relayUrl,
        accepted: true,
        message: "accepted",
        receivedAt: 1_700_500_000,
      }));
      session.receipts.unshift(...receipts);
      return receipts;
    },
  };
}

describe("protocol cli library", () => {
  test("help text teaches only the workflow surface", () => {
    const helpText = buildProtocolCliHelpText();

    expect(helpText).toContain("Preferred operator workflows:");
    expect(helpText).toContain("prepared-migration");
    expect(helpText).not.toContain("run-prepared-migration");
    expect(helpText).not.toContain("continue-prepared-migration");
    expect(helpText).toContain("operate-transition");
    expect(helpText).not.toContain("inspect-transition");
    expect(helpText).not.toContain("publish-bundle");
    expect(helpText).not.toContain("watch-bundle");
    expect(helpText).not.toContain("Low-level prepared primitives");
    expect(helpText).not.toContain("prepare --old-secret");
    expect(helpText).toContain("social-transition");
    expect(helpText).not.toContain("social-claim");
    expect(helpText).not.toContain("social-attest");
    expect(helpText).toContain("--social-bundle <file>");
    expect(helpText).toContain("--social-bundle-dir <dir>");
    expect(helpText).not.toContain("--help-internal");
  });

  test("prepares, updates, executes, and inspects a v3 transition", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_000 },
      createdAt: 1_700_400_000,
    });
    const updated = await cliUpdateAuthority({
      bundle: prepared,
      oldSecretKey: OLD_SECRET_KEY,
      currentMigrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_001 },
      createdAt: 1_700_400_100,
    });
    const executed = await cliExecute({
      bundle: updated,
      activeMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      newSecretKey: NEW_SECRET_KEY,
      createdAt: 1_700_400_200,
    });

    const inspected = await cliInspectTransition({
      preparedBundle: executed,
    });

    expect(inspected.prepared?.state).toBe("prepared_migrated");
    expect(inspected.prepared && "newPubkey" in inspected.prepared ? inspected.prepared.newPubkey : undefined).toBe(
      deriveSchnorrPublicKey(NEW_SECRET_KEY),
    );
  });

  test("creates and resolves social evidence separately", async () => {
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const claimBundle = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_400_300,
    });
    const socialBundle = await cliCreateSocialAttestation({
      bundle: claimBundle,
      oldPubkey,
      newPubkey,
      signerSecretKey: ATTESTOR_SECRET_KEY,
      stance: "support",
      createdAt: 1_700_400_301,
    });

    const inspected = await cliInspectTransition({
      socialBundle,
      viewerFollowSet: new Set([deriveSchnorrPublicKey(ATTESTOR_SECRET_KEY)]),
    });

    expect(inspected.social?.state).toBe("socially_supported");
    expect(inspected.socialAdvice?.nextAction).toBe("review_support");
    expect(inspected.socialWorkflow?.supportCount).toBe(1);
  });

  test("preserves social relay hints across claim and attestation steps", async () => {
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const claimBundle = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_400_305,
      relays: ["wss://relay.one"],
    });
    const socialBundle = await cliCreateSocialAttestation({
      bundle: claimBundle,
      oldPubkey,
      newPubkey,
      signerSecretKey: ATTESTOR_SECRET_KEY,
      stance: "support",
      createdAt: 1_700_400_306,
      relays: ["wss://relay.two", "wss://relay.one"],
    });

    expect(claimBundle.relays).toEqual(["wss://relay.one"]);
    expect(socialBundle.relays).toEqual(["wss://relay.one", "wss://relay.two"]);
  });

  test("summarizes social workflow posture for a viewer context", async () => {
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const attestorPubkey = deriveSchnorrPublicKey(ATTESTOR_SECRET_KEY);
    const claimBundle = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_400_310,
    });
    const socialBundle = await cliCreateSocialAttestation({
      bundle: claimBundle,
      oldPubkey,
      newPubkey,
      signerSecretKey: ATTESTOR_SECRET_KEY,
      stance: "support",
      createdAt: 1_700_400_311,
    });

    const report = await summarizeSocialWorkflow({
      socialBundle,
      viewerFollowSet: new Set([attestorPubkey]),
      viewerTrustedSet: new Set([attestorPubkey]),
    });

    expect(report.state.state).toBe("socially_supported");
    expect(report.claimCount).toBe(1);
    expect(report.attestationCount).toBe(1);
    expect(report.followCount).toBe(1);
    expect(report.trustedCount).toBe(1);
    expect(report.supportCount).toBe(1);
    expect(report.opposeCount).toBe(0);
    expect(report.selfAssertedSupportCount).toBe(0);
    expect(report.selfAssertedOpposeCount).toBe(0);
    expect(report.advice.nextAction).toBe("review_support");
  });

  test("advises setting viewer context when claims exist but no follow or trusted set is provided", async () => {
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const claimBundle = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_400_312,
    });

    const report = await summarizeSocialWorkflow({
      socialBundle: claimBundle,
    });

    expect(report.state.state).toBe("claimed");
    expect(report.advice.nextAction).toBe("set_viewer_context");
    expect(report.advice.missingInputs).toEqual(["follow-pubkeys-or-trusted-pubkeys"]);
  });

  test("derives social transition pubkeys from a migrated prepared bundle", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_000 },
      createdAt: 1_700_400_320,
    });
    const updated = await cliUpdateAuthority({
      bundle: prepared,
      oldSecretKey: OLD_SECRET_KEY,
      currentMigrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_001 },
      createdAt: 1_700_400_321,
    });
    const executed = await cliExecute({
      bundle: updated,
      activeMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      newSecretKey: NEW_SECRET_KEY,
      createdAt: 1_700_400_322,
    });

    const transition = resolveSocialTransitionPubkeys({
      preparedBundle: executed,
    });

    expect(transition).toEqual({
      oldPubkey: deriveSchnorrPublicKey(OLD_SECRET_KEY),
      newPubkey: deriveSchnorrPublicKey(NEW_SECRET_KEY),
    });
  });

  test("derives social transition pubkeys from an existing social bundle", async () => {
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const socialBundle = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_400_324,
    });

    const transition = resolveSocialTransitionPubkeys({
      socialBundle,
    });

    expect(transition).toEqual({
      oldPubkey,
      newPubkey,
    });
  });

  test("refuses to derive social transition pubkeys from a non-executed prepared bundle", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_000 },
      createdAt: 1_700_400_323,
    });

    expect(() =>
      resolveSocialTransitionPubkeys({
        preparedBundle: prepared,
      }),
    ).toThrow("prepared_migrated");
  });

  test("formats social inspection with operator counts and next action", async () => {
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const attestorPubkey = deriveSchnorrPublicKey(ATTESTOR_SECRET_KEY);
    const claimBundle = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_400_324,
    });
    const socialBundle = await cliCreateSocialAttestation({
      bundle: claimBundle,
      oldPubkey,
      newPubkey,
      signerSecretKey: ATTESTOR_SECRET_KEY,
      stance: "support",
      createdAt: 1_700_400_325,
    });

    const inspected = await cliInspectTransition({
      socialBundle,
      viewerFollowSet: new Set([attestorPubkey]),
    });
    const formatted = formatInspectResult(inspected);

    expect(formatted).toContain("social_support_count=1");
    expect(formatted).toContain("social_next_action=review_support");
    expect(formatted).toContain("social_claims=1");
  });

  test("adapts a v3 fixture scenario into the bundle-first CLI lane", async () => {
    const scenario = await getPathAV3FixtureScenario("v3-prepared-migrated");
    expect(scenario).toBeDefined();

    const bundle = buildPreparedBundleFromScenario(scenario!);
    const inspected = await cliInspectTransition({
      preparedBundle: bundle,
    });
    const publishPlan = buildPreparedPublishPlan(bundle);

    expect(inspected.prepared).toEqual(scenario!.expectedState);
    expect(publishPlan.map((entry) => entry.step)).toEqual([
      "prepare",
      "proof",
      "update-authority",
      "proof",
      "execute",
      "execute",
    ]);
  });

  test("adapts a social fixture scenario into the bundle-first CLI lane", async () => {
    const scenario = await getPathCFixtureScenario("socially-supported");
    expect(scenario).toBeDefined();

    const bundle = buildSocialBundleFromScenario(scenario!);
    const inspected = await cliInspectTransition({
      socialBundle: bundle,
      viewerFollowSet: new Set(scenario!.viewerFollowPubkeys),
    });
    const publishPlan = buildSocialPublishPlan(bundle);

    expect(inspected.social).toEqual(scenario!.expectedState);
    expect(publishPlan.map((entry) => entry.step)).toEqual(["claim", "attest", "attest"]);
  });

  test("combines prepared and social publish plans when both bundles are present", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_000 },
      createdAt: 1_700_400_334,
    });
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const socialBundle = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_400_335,
    });

    const publishPlan = buildBundlePublishPlan({
      preparedBundle: prepared,
      socialBundle,
    });

    expect(publishPlan.map((entry) => entry.step)).toEqual(["prepare", "proof", "claim"]);
    expect(publishPlan.map((entry) => entry.event.kind)).toEqual([1776, 1040, 1778]);
  });

  test("combines prepared and social subscription filters when both bundles are present", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_000 },
      createdAt: 1_700_400_336,
    });
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const socialBundle = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_400_337,
    });

    const filters = buildBundleSubscriptionFilters({
      preparedBundle: prepared,
      socialBundle,
    });

    expect(filters).toEqual([
      { ids: prepared.events.map((event) => event.id!) },
      { ids: prepared.otsProofs.flatMap((entry) => (entry.otsEvent?.id ? [entry.otsEvent.id] : [])) },
      { ids: socialBundle.events.map((event) => event.id!) },
    ]);
  });

  test("attaches imported helper proof summaries to a prepared bundle", async () => {
    const scenario = await getPathAV3FixtureScenario("v3-prepared-migrated");
    expect(scenario).toBeDefined();

    let bundle = buildPreparedBundle({
      events: scenario!.events,
    });

    for (const proofEvent of scenario!.otsProofs) {
      bundle = cliAttachPreparedProof({
        bundle,
        artifact: {
          summary: summarizeOtsProofEventForV3(proofEvent),
        },
      });
    }

    const inspected = await cliInspectTransition({
      preparedBundle: bundle,
    });

    expect(inspected.prepared).toEqual(scenario!.expectedState);
  });

  test("attaches imported raw proof events to a prepared bundle", async () => {
    const scenario = await getPathAV3FixtureScenario("v3-prepared-enrolled");
    expect(scenario).toBeDefined();

    let bundle = buildPreparedBundle({
      events: scenario!.events,
    });

    for (const proofEvent of scenario!.otsProofs) {
      bundle = cliAttachPreparedProof({
        bundle,
        artifact: {
          otsEvent: proofEvent,
        },
      });
    }

    const inspected = await cliInspectTransition({
      preparedBundle: bundle,
    });

    expect(inspected.prepared).toEqual(scenario!.expectedState);
  });

  test("builds direct relay filters from prepared and social bundles", async () => {
    const preparedScenario = await getPathAV3FixtureScenario("v3-prepared-enrolled");
    const socialScenario = await getPathCFixtureScenario("socially-supported");
    expect(preparedScenario).toBeDefined();
    expect(socialScenario).toBeDefined();

    const preparedBundle = buildPreparedBundleFromScenario(preparedScenario!);
    const socialBundle = buildSocialBundleFromScenario(socialScenario!);

    expect(buildPreparedBundleSubscriptionFilters(preparedBundle)).toEqual([
      { ids: preparedBundle.events.map((event) => event.id!) },
      { ids: preparedBundle.otsProofs.map((entry) => entry.otsEvent!.id!) },
    ]);
    expect(buildSocialBundleSubscriptionFilters(socialBundle)).toEqual([
      { ids: socialBundle.events.map((event) => event.id!) },
    ]);
  });

  test("runs a prepared migration flow end to end when both proofs are confirmed", async () => {
    const result = await cliRunPreparedMigrationFlow({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      newSecretKey: NEW_SECRET_KEY,
      rootProof: { status: "bitcoin_confirmed", anchorHeight: 840_100 },
      updateProof: { status: "bitcoin_confirmed", anchorHeight: 840_101 },
      createdAtStart: 1_700_401_000,
    });

    expect(result.stage).toBe("prepared_migrated");
    expect(result.executedState?.state).toBe("prepared_migrated");
    expect(result.stopReason).toBeUndefined();
  });

  test("stops the prepared migration flow honestly when the update proof is still pending", async () => {
    const result = await cliRunPreparedMigrationFlow({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      newSecretKey: NEW_SECRET_KEY,
      rootProof: { status: "bitcoin_confirmed", anchorHeight: 840_100 },
      updateProof: { status: "pending" },
      createdAtStart: 1_700_402_000,
    });

    expect(result.stage).toBe("prepared_enrolled");
    expect(result.updatedState?.state).toBe("prepared_enrolled");
    expect(result.executedBundle).toBeUndefined();
    expect(result.stopReason).toContain("update proof");
  });

  test("continues a saved prepared bundle through proof arrival and execution", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      createdAt: 1_700_403_000,
    });

    const result = await cliContinuePreparedMigration({
      bundle: prepared,
      oldSecretKey: OLD_SECRET_KEY,
      currentMigrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      newSecretKey: NEW_SECRET_KEY,
      rootProof: { status: "bitcoin_confirmed", anchorHeight: 840_200 },
      updateProof: { status: "bitcoin_confirmed", anchorHeight: 840_201 },
    });

    expect(result.finalState.state).toBe("prepared_migrated");
    expect(result.snapshots.map((snapshot) => snapshot.label)).toEqual([
      "input",
      "root-proof-attached",
      "authority-updated",
      "update-proof-attached",
      "executed",
    ]);
    expect(result.stopReason).toBeUndefined();
  });

  test("stops honestly when a pending PMU exists but its proof has not made it active yet", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_300 },
      createdAt: 1_700_404_000,
    });
    const updated = await cliUpdateAuthority({
      bundle: prepared,
      oldSecretKey: OLD_SECRET_KEY,
      currentMigrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      createdAt: 1_700_404_100,
    });

    const result = await cliContinuePreparedMigration({
      bundle: updated,
      currentMigrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      newSecretKey: NEW_SECRET_KEY,
    });

    expect(result.finalState.state).toBe("prepared_enrolled");
    expect(result.snapshots.map((snapshot) => snapshot.label)).toEqual(["input"]);
    expect(result.stopReason).toContain("PMU");
    expect(result.stopReason).toContain("unconfirmed");
  });

  test("advises attaching a root proof when a PMA exists without proof", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      createdAt: 1_700_405_000,
    });

    expect(advisePreparedMigration(prepared)).toEqual({
      nextAction: "attach_root_proof",
      summary: "the PMA root exists but has no attached proof yet",
      missingInputs: ["root-proof-event-or-summary"],
      targetEventId: prepared.events[0]!.id!,
    });
  });

  test("advises adding a PMU when the root is confirmed and no authority update exists", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_400 },
      createdAt: 1_700_406_000,
    });

    expect(advisePreparedMigration(prepared)).toEqual({
      nextAction: "add_authority_update",
      summary: "the root is enrolled and ready for the next PMU authority update",
      missingInputs: ["old-secret", "current-migration-secret", "next-migration-secret"],
    });
  });

  test("advises waiting for update confirmation when the latest PMU proof is still pending", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_500 },
      createdAt: 1_700_407_000,
    });
    const updated = await cliUpdateAuthority({
      bundle: prepared,
      oldSecretKey: OLD_SECRET_KEY,
      currentMigrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      proof: { status: "pending" },
      createdAt: 1_700_407_100,
    });

    const latestPmu = updated.events.filter((event) => event.kind === 1779).at(-1)!;
    expect(advisePreparedMigration(updated)).toEqual({
      nextAction: "wait_update_confirmation",
      summary:
        "the latest PMU proof is still pending; wait for Bitcoin confirmation or import an updated proof summary",
      missingInputs: ["confirmed-update-proof"],
      targetEventId: latestPmu.id!,
    });
  });

  test("reports a prepared bundle as fully relay-replayable when raw proof events are present", async () => {
    const scenario = await getPathAV3FixtureScenario("v3-prepared-migrated");
    expect(scenario).toBeDefined();

    const bundle = buildPreparedBundleFromScenario(scenario!);
    expect(summarizePreparedMigrationRelayReport(bundle)).toEqual({
      relayStatus: "fully_relay_replayable",
      publishableEventCount: bundle.events.length,
      publishableProofCount: bundle.otsProofs.length,
      localOnlyProofTargets: [],
      summaryOnlyProofTargets: [],
      relayObservableEventIds: bundle.events.map((event) => event.id!),
      relayObservableProofEventIds: bundle.otsProofs.map((entry) => entry.otsEvent!.id!),
    });
  });

  test("reports summary-only proofs as local-only operator evidence", async () => {
    const scenario = await getPathAV3FixtureScenario("v3-prepared-enrolled");
    expect(scenario).toBeDefined();

    let bundle = buildPreparedBundle({
      events: scenario!.events,
    });

    for (const proofEvent of scenario!.otsProofs) {
      bundle = cliAttachPreparedProof({
        bundle,
        artifact: {
          summary: summarizeOtsProofEventForV3(proofEvent),
        },
      });
    }

    const report = summarizePreparedMigrationRelayReport(bundle);
    expect(report.relayStatus).toBe("partially_local_only");
    expect(report.publishableEventCount).toBe(bundle.events.length);
    expect(report.publishableProofCount).toBe(0);
    expect(report.localOnlyProofTargets).toEqual(bundle.otsProofs.map((entry) => entry.targetEventId));
    expect(report.summaryOnlyProofTargets).toEqual(bundle.otsProofs.map((entry) => entry.targetEventId));

    const inspected = await cliInspectTransition({
      preparedBundle: bundle,
    });
    expect(inspected.preparedRelayReport).toEqual(report);
  });

  test("summarizes prepared workflow posture in one report", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      createdAt: 1_700_408_500,
    });

    const report = summarizePreparedWorkflow(prepared);
    expect(report.state).toEqual({ state: "none" });
    expect(report.advice).toEqual({
      nextAction: "attach_root_proof",
      summary: "the PMA root exists but has no attached proof yet",
      missingInputs: ["root-proof-event-or-summary"],
      targetEventId: prepared.events[0]!.id!,
    });
    expect(report.relayReport.relayStatus).toBe("fully_relay_replayable");
    expect(report.relayReport.publishableEventCount).toBe(1);
    expect(report.relayReport.publishableProofCount).toBe(0);
  });

  test("selects the latest saved prepared snapshot name deterministically", () => {
    expect(
      selectLatestPreparedSnapshotName([
        "notes.txt",
        "00-input.json",
        "03-executed.json",
        "02-update-proof-attached.json",
        "01-root-proof-attached.json",
      ]),
    ).toBe("03-executed.json");
  });

  test("selects the latest named prepared workflow output when numbered snapshots are absent", () => {
    expect(
      selectLatestPreparedSnapshotName([
        "prepared-root.json",
        "prepared-updated.json",
        "prepared-executed.json",
      ]),
    ).toBe("prepared-executed.json");
  });

  test("selects the latest prepared snapshot while ignoring unrelated directory entries", () => {
    expect(
      selectLatestPreparedSnapshotName([
        "README.txt",
        "prepared-root.json",
        "02-update-proof-attached.json",
        "junk",
        "04-executed.json",
      ]),
    ).toBe("04-executed.json");
  });

  test("prefers the latest numbered prepared snapshot over named workflow files", () => {
    expect(
      selectLatestPreparedSnapshotName([
        "prepared-root.json",
        "prepared-updated.json",
        "prepared-executed.json",
        "03-executed.json",
      ]),
    ).toBe("03-executed.json");
  });

  test("lists prepared snapshots in descending workflow order", () => {
    expect(
      listPreparedSnapshotNamesDescending([
        "prepared-root.json",
        "02-update-proof-attached.json",
        "01-root-proof-attached.json",
        "prepared-executed.json",
        "notes.txt",
      ]),
    ).toEqual([
      "02-update-proof-attached.json",
      "prepared-executed.json",
      "01-root-proof-attached.json",
      "prepared-root.json",
    ]);
  });

  test("selects the latest social snapshot name deterministically", () => {
    expect(
      selectLatestSocialSnapshotName([
        "social-claimed.json",
        "notes.txt",
        "02-social-attested.json",
        "01-social-claimed.json",
      ]),
    ).toBe("02-social-attested.json");
  });

  test("lists social snapshots in descending workflow order", () => {
    expect(
      listSocialSnapshotNamesDescending([
        "social-claimed.json",
        "02-social-attested.json",
        "01-social-claimed.json",
        "social-attested.json",
        "notes.txt",
      ]),
    ).toEqual([
      "02-social-attested.json",
      "01-social-claimed.json",
      "social-attested.json",
      "social-claimed.json",
    ]);
  });

  test("refuses to publish a prepared bundle when strict relay replayability is required", async () => {
    const scenario = await getPathAV3FixtureScenario("v3-prepared-enrolled");
    expect(scenario).toBeDefined();

    let bundle = buildPreparedBundle({
      events: scenario!.events,
    });

    for (const proofEvent of scenario!.otsProofs) {
      bundle = cliAttachPreparedProof({
        bundle,
        artifact: {
          summary: summarizeOtsProofEventForV3(proofEvent),
        },
      });
    }

    await expect(
      cliPublishBundle({
        preparedBundle: bundle,
        requireFullyRelayReplayable: true,
      }),
    ).rejects.toThrow("not fully relay-replayable");
  });

  test("refuses to continue-and-publish when the resulting bundle still has summary-only proofs and strict relayability is required", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      createdAt: 1_700_409_000,
    });
    const rootTargetId = prepared.events.find((event) => event.kind === 1776)!.id!;
    const firstPass = await cliContinuePreparedMigration({
      bundle: prepared,
      oldSecretKey: OLD_SECRET_KEY,
      currentMigrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      rootProofArtifact: {
        summary: {
          ok: true,
          targetEventId: rootTargetId,
          targetKind: 1776,
          status: "bitcoin_confirmed",
          anchorHeight: 840_700,
        },
      },
    });
    const authorityUpdated = firstPass.snapshots.find((snapshot) => snapshot.label === "authority-updated")!;
    const updateTargetId = authorityUpdated.bundle.events.find((event) => event.kind === 1779)!.id!;

    await expect(
      cliContinuePreparedMigration({
        bundle: authorityUpdated.bundle,
        currentMigrationSecretKey: MIGRATION_SECRET_KEY,
        nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
        newSecretKey: NEW_SECRET_KEY,
        updateProofArtifact: {
          summary: {
            ok: true,
            targetEventId: updateTargetId,
            targetKind: 1779,
            status: "bitcoin_confirmed",
            anchorHeight: 840_701,
          },
        },
        publish: true,
        requireFullyRelayReplayable: true,
      }),
    ).rejects.toThrow("not fully relay-replayable");
  });

  test("operates on a prepared bundle without social input", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_100 },
      createdAt: 1_700_410_000,
      relays: ["wss://relay.prepared"],
    });

    const result = await cliOperateTransition({
      preparedBundle: prepared,
    });

    expect(result.input.effectiveRelays).toEqual(["wss://relay.prepared"]);
    expect(result.inspection.prepared?.state).toBe("prepared_enrolled");
    expect(result.inspection.social).toBeUndefined();
    expect(result.publishResult).toBeUndefined();
    expect(result.watchResult).toBeUndefined();
  });

  test("operates on prepared and social bundles together", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_101 },
      createdAt: 1_700_410_100,
      relays: ["wss://relay.prepared"],
    });
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const social = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_410_101,
      relays: ["wss://relay.social"],
    });

    const result = await cliOperateTransition({
      preparedBundle: prepared,
      socialBundle: social,
      viewerFollowSet: new Set([oldPubkey]),
    });

    expect(result.inspection.prepared?.state).toBe("prepared_enrolled");
    expect(result.inspection.social?.state).toBe("claimed");
    expect(result.input.effectiveRelays).toEqual(["wss://relay.prepared", "wss://relay.social"]);
  });

  test("operate-transition prefers explicit relays over bundle relay hints", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_102 },
      createdAt: 1_700_410_200,
      relays: ["wss://relay.prepared"],
    });

    const result = await cliOperateTransition({
      preparedBundle: prepared,
      relays: ["wss://relay.override"],
    });

    expect(result.input.effectiveRelays).toEqual(["wss://relay.override"]);
  });

  test("operate-transition rejects strict publish when prepared proofs are not fully relayable", async () => {
    const scenario = await getPathAV3FixtureScenario("v3-prepared-enrolled");
    expect(scenario).toBeDefined();

    let bundle = buildPreparedBundle({
      events: scenario!.events,
    });

    for (const proofEvent of scenario!.otsProofs) {
      bundle = cliAttachPreparedProof({
        bundle,
        artifact: {
          summary: summarizeOtsProofEventForV3(proofEvent),
        },
      });
    }

    await expect(
      cliOperateTransition({
        preparedBundle: bundle,
        publish: true,
        requireFullyRelayReplayable: true,
        relayRuntime: createFakeRelayRuntime({}),
      }),
    ).rejects.toThrow("not fully relay-replayable");
  });

  test("operate-transition publishes and watches prepared and social evidence together", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_103 },
      createdAt: 1_700_410_300,
      relays: ["wss://relay.prepared"],
    });
    const oldPubkey = deriveSchnorrPublicKey(OLD_SECRET_KEY);
    const newPubkey = deriveSchnorrPublicKey(NEW_SECRET_KEY);
    const social = await cliCreateSocialClaim({
      oldPubkey,
      newPubkey,
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_410_301,
      relays: ["wss://relay.social"],
    });
    const observedStateText: string[] = [];
    const relayRuntime = createFakeRelayRuntime({
      observedEvents: [
        ...prepared.events,
        ...prepared.otsProofs.flatMap((entry) => (entry.otsEvent ? [entry.otsEvent] : [])),
        ...social.events,
      ],
    });

    const result = await cliOperateTransition({
      preparedBundle: prepared,
      socialBundle: social,
      publish: true,
      watchSeconds: 0,
      relayRuntime,
      onWatchEvent: async (_event, stateText) => {
        if (stateText) {
          observedStateText.push(stateText);
        }
      },
    });

    expect(result.publishResult?.entries.map((entry) => entry.step)).toEqual(["prepare", "proof", "claim"]);
    expect(result.watchResult?.finalInspection.prepared?.state).toBe("prepared_enrolled");
    expect(result.watchResult?.finalInspection.social?.state).toBe("claimed");
    expect(observedStateText).toContain("prepared_enrolled/claimed");
  });

  test("cliPublishBundle reports partial relay success and timed out relays", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_104 },
      createdAt: 1_700_410_400,
      relays: ["wss://relay.test.one", "wss://relay.test.two"],
    });

    const result = await cliPublishBundle({
      preparedBundle: prepared,
      relayRuntime: createFakeRelayRuntime({
        relays: ["wss://relay.test.one", "wss://relay.test.two"],
        publishEvent(session, event) {
          return [
            {
              eventId: event.id!,
              relayUrl: session.relays[0]!,
              accepted: true,
              message: "accepted",
              receivedAt: 1_700_500_000,
            },
          ];
        },
      }),
    });

    expect(result.attemptedRelays).toEqual(["wss://relay.test.one", "wss://relay.test.two"]);
    expect(result.entries[0]?.acceptedRelays).toEqual(["wss://relay.test.one"]);
    expect(result.entries[0]?.timedOutRelays).toEqual(["wss://relay.test.two"]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.failedEntries).toEqual([]);
  });

  test("cliPublishBundle marks entries as failed when no relay accepts them", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_105 },
      createdAt: 1_700_410_500,
      relays: ["wss://relay.test.one", "wss://relay.test.two"],
    });

    const result = await cliPublishBundle({
      preparedBundle: prepared,
      relayRuntime: createFakeRelayRuntime({
        relays: ["wss://relay.test.one", "wss://relay.test.two"],
        publishEvent() {
          return [];
        },
      }),
    });

    expect(result.failedEntries).toHaveLength(2);
    expect(result.failedEntries.map((entry) => entry.step)).toEqual(["prepare", "proof"]);
    expect(result.entries.every((entry) => entry.acceptedRelays.length === 0)).toBe(true);
  });

  test("cliWatchBundle reports missing target ids after timeout", async () => {
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_106 },
      createdAt: 1_700_410_600,
      relays: ["wss://relay.test.one"],
    });

    const result = await cliOperateTransition({
      preparedBundle: prepared,
      watchSeconds: 0,
      relayRuntime: createFakeRelayRuntime({
        relays: ["wss://relay.test.one"],
        observedEvents: [],
      }),
    });

    expect(result.watchResult?.timedOut).toBe(true);
    expect(result.watchResult?.observedEventIds).toEqual([]);
    expect(result.watchResult?.missingEventIds).toEqual(
      result.watchResult?.targetEventIds,
    );
  });
});
