import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildPreparedBundleFromScenario,
  buildSocialBundleFromScenario,
  cliCreateSocialClaim,
  cliExecute,
  cliPrepare,
  cliUpdateAuthority,
  writePreparedBundle,
  writeSocialBundle,
} from "./protocol-cli-lib";
import { deriveSchnorrPublicKey } from "../packages/protocol-shared/src/index";
import { getPathAV3FixtureScenario, getPathCFixtureScenario } from "../packages/fixtures/src/index";

const OLD_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000021";
const MIGRATION_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000022";
const NEXT_MIGRATION_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000023";
const NEW_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000024";
const ATTESTOR_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000025";

async function runCli(args: string[], input?: { env?: Record<string, string> }) {
  const proc = Bun.spawn({
    cmd: ["bun", "scripts/protocol-cli.ts", ...args],
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...(input?.env ?? {}),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

function expectJsonFailure(
  result: Awaited<ReturnType<typeof runCli>>,
  input: { exitCode: number; code: string; command?: string },
) {
  expect(result.exitCode).toBe(input.exitCode);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.ok).toBe(false);
  if (input.command) {
    expect(parsed.command).toBe(input.command);
  }
  expect(parsed.error.code).toBe(input.code);
  expect(typeof parsed.error.message).toBe("string");
}

function expectSuccessEnvelope(
  parsed: Record<string, unknown>,
  input: { command: string; mode?: string },
) {
  expect(parsed.ok).toBe(true);
  expect(parsed.command).toBe(input.command);
  if (input.mode) {
    expect(parsed.mode).toBe(input.mode);
  }
  expect(Array.isArray(parsed.warning)).toBe(true);
}

async function createPreparedMigratedBundle(input: {
  relays?: string[];
  createdAtStart: number;
}) {
  const prepared = await cliPrepare({
    oldSecretKey: OLD_SECRET_KEY,
    migrationSecretKey: MIGRATION_SECRET_KEY,
    proof: { status: "bitcoin_confirmed", anchorHeight: 840_201 },
    createdAt: input.createdAtStart,
    relays: input.relays,
  });
  const updated = await cliUpdateAuthority({
    bundle: prepared,
    oldSecretKey: OLD_SECRET_KEY,
    currentMigrationSecretKey: MIGRATION_SECRET_KEY,
    nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
    proof: { status: "bitcoin_confirmed", anchorHeight: 840_202 },
    createdAt: input.createdAtStart + 1,
  });
  return cliExecute({
    bundle: updated,
    activeMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
    newSecretKey: NEW_SECRET_KEY,
    createdAt: input.createdAtStart + 2,
  });
}

describe("protocol cli command", () => {
  test("help includes operate-transition", async () => {
    const result = await runCli(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("operate-transition");
    expect(result.stdout).toContain("prepared-migration");
    expect(result.stdout).not.toContain("run-prepared-migration");
    expect(result.stdout).not.toContain("continue-prepared-migration");
    expect(result.stdout).not.toContain("inspect-transition");
    expect(result.stdout).not.toContain("publish-bundle");
    expect(result.stdout).not.toContain("watch-bundle");
    expect(result.stdout).not.toContain("Low-level prepared primitives");
    expect(result.stdout).not.toContain("prepare --old-secret");
    expect(result.stdout).not.toContain("update-authority");
    expect(result.stdout).not.toContain("execute (--bundle");
    expect(result.stdout).toContain("social-transition");
    expect(result.stdout).not.toContain("social-claim");
    expect(result.stdout).not.toContain("social-attest");
    expect(result.stdout).toContain("--social-bundle <file>");
    expect(result.stdout).toContain("--social-bundle-dir <dir>");
  });

  test("operate-transition requires prepared input", async () => {
    const result = await runCli(["operate-transition"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERR_MISSING_FLAG");
    expect(result.stderr).toContain("prepared");
  });

  test("unknown command returns a structured unknown-command failure", async () => {
    const result = await runCli(["totally-unknown-command"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERR_UNKNOWN_COMMAND");
    expect(result.stderr).toContain("totally-unknown-command");
  });

  test("json failures return structured error output for missing required flags", async () => {
    const result = await runCli(["operate-transition", "--json"]);
    expectJsonFailure(result, {
      exitCode: 1,
      command: "operate-transition",
      code: "ERR_MISSING_FLAG",
    });
  });

  test("prepared-migration starts a workflow from fresh secrets", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-prepared-start-"));
    const outDir = join(dir, "prepared");
    const result = await runCli([
      "prepared-migration",
      "--old-secret",
      OLD_SECRET_KEY,
      "--migration-secret",
      MIGRATION_SECRET_KEY,
      "--next-migration-secret",
      NEXT_MIGRATION_SECRET_KEY,
      "--new-secret",
      NEW_SECRET_KEY,
      "--root-proof",
      "bitcoin_confirmed",
      "--root-anchor-height",
      "840200",
      "--update-proof",
      "bitcoin_confirmed",
      "--update-anchor-height",
      "840201",
      "--out-dir",
      outDir,
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expectSuccessEnvelope(parsed, { command: "prepared-migration", mode: "start" });
    expect(parsed.input.oldSecretProvided).toBe(true);
    expect(parsed.input.migrationSecretProvided).toBe(true);
    expect(parsed.input.nextMigrationSecretProvided).toBe(true);
    expect(parsed.input.newSecretProvided).toBe(true);
    expect(parsed.input.publish).toBe(false);
    expect(parsed.stage).toBe("prepared_migrated");
    expect(parsed.outputs.prepared).toContain("prepared-root.json");
    expect(parsed.outputs.updated).toContain("prepared-updated.json");
    expect(parsed.outputs.executed).toContain("prepared-executed.json");
    expect(parsed.operatorReport.state.state).toBe("prepared_migrated");
  });

  test("prepared-migration resumes from an existing bundle", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-prepared-resume-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_220 },
      createdAt: 1_700_421_000,
    });
    const bundlePath = join(dir, "prepared-root.json");
    await writeFile(bundlePath, writePreparedBundle(prepared), "utf8");
    const outDir = join(dir, "continued");

    const result = await runCli([
      "prepared-migration",
      "--bundle",
      bundlePath,
      "--out-dir",
      outDir,
      "--old-secret",
      OLD_SECRET_KEY,
      "--current-migration-secret",
      MIGRATION_SECRET_KEY,
      "--next-migration-secret",
      NEXT_MIGRATION_SECRET_KEY,
      "--update-proof",
      "bitcoin_confirmed",
      "--update-anchor-height",
      "840221",
      "--new-secret",
      NEW_SECRET_KEY,
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expectSuccessEnvelope(parsed, { command: "prepared-migration", mode: "resume" });
    expect(parsed.input.oldSecretProvided).toBe(true);
    expect(parsed.input.currentMigrationSecretProvided).toBe(true);
    expect(parsed.input.nextMigrationSecretProvided).toBe(true);
    expect(parsed.input.newSecretProvided).toBe(true);
    expect(parsed.bundleSource).toBe(bundlePath);
    expect(parsed.finalState.state).toBe("prepared_migrated");
    expect(parsed.operatorReport.state.state).toBe("prepared_migrated");
  });

  test("prepared-migration stops honestly when no provided migration secret matches the active authority", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-prepared-wrong-secret-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_230 },
      createdAt: 1_700_421_100,
    });
    const updated = await cliUpdateAuthority({
      bundle: prepared,
      oldSecretKey: OLD_SECRET_KEY,
      currentMigrationSecretKey: MIGRATION_SECRET_KEY,
      nextMigrationSecretKey: NEXT_MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_231 },
      createdAt: 1_700_421_101,
    });
    const bundlePath = join(dir, "prepared-updated.json");
    await writeFile(bundlePath, writePreparedBundle(updated), "utf8");
    const outDir = join(dir, "continued");

    const result = await runCli([
      "prepared-migration",
      "--bundle",
      bundlePath,
      "--out-dir",
      outDir,
      "--old-secret",
      OLD_SECRET_KEY,
      "--current-migration-secret",
      NEW_SECRET_KEY,
      "--new-secret",
      NEW_SECRET_KEY,
      "--json",
    ]);
    expectJsonFailure(result, {
      exitCode: 1,
      command: "prepared-migration",
      code: "ERR_SECRET_MISMATCH",
    });
  });

  test("prepared-migration reports waiting for update confirmation when the latest PMU proof is still pending", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-prepared-pending-update-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_240 },
      createdAt: 1_700_421_200,
    });
    const bundlePath = join(dir, "prepared-root.json");
    await writeFile(bundlePath, writePreparedBundle(prepared), "utf8");
    const outDir = join(dir, "continued");

    const result = await runCli([
      "prepared-migration",
      "--bundle",
      bundlePath,
      "--out-dir",
      outDir,
      "--old-secret",
      OLD_SECRET_KEY,
      "--current-migration-secret",
      MIGRATION_SECRET_KEY,
      "--next-migration-secret",
      NEXT_MIGRATION_SECRET_KEY,
      "--update-proof",
      "pending",
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expectSuccessEnvelope(parsed, { command: "prepared-migration", mode: "resume" });
    expect(parsed.finalState.state).toBe("prepared_enrolled");
    expect(parsed.stopReason).toContain("proof is still missing or unconfirmed");
    expect(parsed.operatorReport.advice.nextAction).toBe("wait_update_confirmation");
    expect(parsed.operatorReport.advice.missingInputs).toContain("confirmed-update-proof");
  });

  test("operate-transition returns combined json for prepared-only input", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_200 },
      createdAt: 1_700_420_000,
      relays: ["wss://relay.prepared"],
    });
    const preparedPath = join(dir, "prepared-root.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const result = await runCli(["operate-transition", "--prepared-bundle", preparedPath, "--json"]);
    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expectSuccessEnvelope(parsed, { command: "operate-transition" });
    expect(parsed.input.preparedSource.kind).toBe("file");
    expect(parsed.input.effectiveRelays).toEqual(["wss://relay.prepared"]);
    expect(parsed.input.publish).toBe(false);
    expect(parsed.input.watchSeconds).toBeUndefined();
    expect(parsed.inspection.prepared.state).toBe("prepared_enrolled");
    expect(parsed.inspection.social).toBeUndefined();
  });

  test("operate-transition rejects both --prepared-bundle and --prepared-bundle-dir", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-conflict-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_210 },
      createdAt: 1_700_420_010,
    });
    const preparedPath = join(dir, "prepared-root.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const result = await runCli([
      "operate-transition",
      "--prepared-bundle",
      preparedPath,
      "--prepared-bundle-dir",
      dir,
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERR_FLAG_CONFLICT");
    expect(result.stderr).toContain("accepts either --prepared-bundle or --prepared-bundle-dir, not both");
  });

  test("operate-transition rejects both --social-bundle and --social-bundle-dir", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-social-conflict-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_211 },
      createdAt: 1_700_420_020,
    });
    const preparedPath = join(dir, "prepared-root.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const social = await cliCreateSocialClaim({
      oldPubkey: deriveSchnorrPublicKey(OLD_SECRET_KEY),
      newPubkey: deriveSchnorrPublicKey(NEW_SECRET_KEY),
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_420_021,
    });
    const socialDir = join(dir, "social");
    await mkdir(socialDir, { recursive: true });
    const socialPath = join(socialDir, "social-claimed.json");
    await writeFile(socialPath, writeSocialBundle(social), "utf8");

    const result = await runCli([
      "operate-transition",
      "--prepared-bundle",
      preparedPath,
      "--social-bundle",
      socialPath,
      "--social-bundle-dir",
      socialDir,
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERR_FLAG_CONFLICT");
    expect(result.stderr).toContain("accepts either --social-bundle or --social-bundle-dir, not both");
  });

  test("operate-transition resolves latest prepared and social snapshots from directories", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-dirs-"));
    const preparedDir = join(dir, "prepared");
    const socialDir = join(dir, "social");
    await mkdir(preparedDir, { recursive: true });
    await mkdir(socialDir, { recursive: true });

    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_201 },
      createdAt: 1_700_420_100,
      relays: ["wss://relay.prepared"],
    });
    const executed = await createPreparedMigratedBundle({
      createdAtStart: 1_700_420_100,
      relays: ["wss://relay.prepared"],
    });
    await writeFile(join(preparedDir, "prepared-root.json"), writePreparedBundle(prepared), "utf8");
    await writeFile(join(preparedDir, "prepared-executed.json"), writePreparedBundle(executed), "utf8");

    const social = await cliCreateSocialClaim({
      oldPubkey: deriveSchnorrPublicKey(OLD_SECRET_KEY),
      newPubkey: deriveSchnorrPublicKey(NEW_SECRET_KEY),
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_420_103,
      relays: ["wss://relay.social"],
    });
    await writeFile(join(socialDir, "social-claimed.json"), writeSocialBundle(social), "utf8");

    const result = await runCli([
      "operate-transition",
      "--prepared-bundle-dir",
      preparedDir,
      "--social-bundle-dir",
      socialDir,
      "--json",
    ]);
    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.stdout);
    expectSuccessEnvelope(parsed, { command: "operate-transition" });
    expect(parsed.input.preparedSource.kind).toBe("dir");
    expect(parsed.input.socialSource.kind).toBe("dir");
    expect(parsed.inspection.prepared.state).toBe("prepared_migrated");
    expect(parsed.inspection.social.state).toBe("claimed");
  });

  test("operate-transition text output includes prepared and social state when both exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-text-"));
    const prepared = await createPreparedMigratedBundle({
      createdAtStart: 1_700_420_300,
      relays: ["wss://relay.prepared"],
    });
    const preparedPath = join(dir, "prepared-executed.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const social = await cliCreateSocialClaim({
      oldPubkey: deriveSchnorrPublicKey(OLD_SECRET_KEY),
      newPubkey: deriveSchnorrPublicKey(NEW_SECRET_KEY),
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_420_303,
      relays: ["wss://relay.social"],
    });
    const socialPath = join(dir, "social-claimed.json");
    await writeFile(socialPath, writeSocialBundle(social), "utf8");

    const result = await runCli([
      "operate-transition",
      "--prepared-bundle",
      preparedPath,
      "--social-bundle",
      socialPath,
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("effective_relays=wss://relay.prepared,wss://relay.social");
    expect(result.stdout).toContain("prepared_state=prepared_migrated");
    expect(result.stdout).toContain("social_state=claimed");
  });

  test("operate-transition prepared-only text output keeps social lane explicit", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-prepared-only-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_212 },
      createdAt: 1_700_420_400,
      relays: ["wss://relay.prepared"],
    });
    const preparedPath = join(dir, "prepared-root.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const result = await runCli(["operate-transition", "--prepared-bundle", preparedPath]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("prepared_state=prepared_enrolled");
    expect(result.stdout).toContain("social_state=none");
  });

  test("operate-transition strict relayability failure exits non-zero with clear error", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-strict-"));
    const scenario = await getPathAV3FixtureScenario("v3-prepared-enrolled");
    expect(scenario).toBeDefined();
    const preparedWithProofs = buildPreparedBundleFromScenario(scenario!, ["wss://relay.prepared"]);
    const prepared = {
      ...preparedWithProofs,
      otsProofs: preparedWithProofs.otsProofs.map(({ targetEventId, summary }) => ({
        targetEventId,
        summary,
      })),
    };
    const preparedPath = join(dir, "prepared-root.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const result = await runCli([
      "operate-transition",
      "--prepared-bundle",
      preparedPath,
      "--publish",
      "--require-fully-relayable",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERR_NOT_FULLY_RELAYABLE");
    expect(result.stderr).toContain("not fully relay-replayable");
  });

  test("operate-transition keeps partial relay publish as a warning, not a hard failure", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-partial-publish-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_213 },
      createdAt: 1_700_420_450,
    });
    const preparedPath = join(dir, "prepared-root.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const result = await runCli(
      [
        "operate-transition",
        "--prepared-bundle",
        preparedPath,
        "--publish",
        "--json",
      ],
      {
        env: {
          PUBSWITCH_TEST_RELAY_MODE: "publish-partial",
        },
      },
    );
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expectSuccessEnvelope(parsed, { command: "operate-transition" });
    expect(parsed.warning.length).toBeGreaterThan(0);
    expect(parsed.publishResult.failedEntries).toEqual([]);
    expect(parsed.publishResult.entries[0].timedOutRelays.length).toBeGreaterThan(0);
  });

  test("operate-transition returns ERR_RELAY_PUBLISH_FAILED when no relay accepts published events", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-publish-fail-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_214 },
      createdAt: 1_700_420_460,
    });
    const preparedPath = join(dir, "prepared-root.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const result = await runCli(
      [
        "operate-transition",
        "--prepared-bundle",
        preparedPath,
        "--publish",
        "--json",
      ],
      {
        env: {
          PUBSWITCH_TEST_RELAY_MODE: "publish-fail",
        },
      },
    );
    expectJsonFailure(result, {
      exitCode: 2,
      command: "operate-transition",
      code: "ERR_RELAY_PUBLISH_FAILED",
    });
  });

  test("operate-transition returns ERR_WATCH_TIMEOUT when requested relay observation never arrives", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-watch-timeout-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_215 },
      createdAt: 1_700_420_470,
    });
    const preparedPath = join(dir, "prepared-root.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const result = await runCli(
      [
        "operate-transition",
        "--prepared-bundle",
        preparedPath,
        "--watch-seconds",
        "0",
        "--json",
      ],
      {
        env: {
          PUBSWITCH_TEST_RELAY_MODE: "watch-timeout",
        },
      },
    );
    expectJsonFailure(result, {
      exitCode: 2,
      command: "operate-transition",
      code: "ERR_WATCH_TIMEOUT",
    });
  });

  test("operate-transition keeps both lanes visible when prepared evidence conflicts and social evidence is split", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-operate-conflict-matrix-"));
    const preparedScenario = await getPathAV3FixtureScenario("v3-conflicting-authority-updates");
    const socialScenario = await getPathCFixtureScenario("socially-split");
    expect(preparedScenario).toBeDefined();
    expect(socialScenario).toBeDefined();

    const preparedPath = join(dir, "prepared-conflict.json");
    const socialPath = join(dir, "social-split.json");
    await writeFile(
      preparedPath,
      writePreparedBundle(buildPreparedBundleFromScenario(preparedScenario!, ["wss://relay.prepared"])),
      "utf8",
    );
    await writeFile(socialPath, writeSocialBundle(buildSocialBundleFromScenario(socialScenario!)), "utf8");

    const result = await runCli([
      "operate-transition",
      "--prepared-bundle",
      preparedPath,
      "--social-bundle",
      socialPath,
      "--follow-pubkeys",
      socialScenario!.viewerFollowPubkeys.join(","),
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expectSuccessEnvelope(parsed, { command: "operate-transition" });
    expect(parsed.inspection.prepared.state).toBe("conflicting_authority_updates");
    expect(parsed.inspection.preparedAdvice.nextAction).toBe("resolve_conflict");
    expect(parsed.inspection.social.state).toBe("socially_split");
    expect(parsed.inspection.socialAdvice.nextAction).toBe("review_split");
  });

  test("social-transition creates a claim when no stance is supplied", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-social-claim-"));
    const prepared = await createPreparedMigratedBundle({
      createdAtStart: 1_700_420_600,
    });
    const preparedPath = join(dir, "prepared-executed.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const existingSocial = await cliCreateSocialClaim({
      oldPubkey: deriveSchnorrPublicKey(OLD_SECRET_KEY),
      newPubkey: deriveSchnorrPublicKey(NEW_SECRET_KEY),
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_420_603,
    });
    const socialDir = join(dir, "social");
    await mkdir(socialDir, { recursive: true });
    const socialPath = join(socialDir, "social-claimed.json");
    await writeFile(socialPath, writeSocialBundle(existingSocial), "utf8");

    const fileResult = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--social-bundle",
      socialPath,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--out-dir",
      join(dir, "out-file"),
    ]);
    expect(fileResult.exitCode).toBe(0);
    expect(fileResult.stdout).toContain("command=social-transition");
    expect(fileResult.stdout).toContain("mode=claim");
    expect(fileResult.stdout).toContain("output=");
    expect(fileResult.stdout).toContain("social_claims=");
    expect(fileResult.stdout).toContain("social_next_action=");

    const dirResult = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--social-bundle-dir",
      socialDir,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--out-dir",
      join(dir, "out-dir"),
      "--json",
    ]);
    expect(dirResult.exitCode).toBe(0);
    const dirParsed = JSON.parse(dirResult.stdout);
    expectSuccessEnvelope(dirParsed, { command: "social-transition", mode: "claim" });
    expect(dirParsed.input.signerSecretProvided).toBe(true);
    expect(dirParsed.input.preparedSource.kind).toBe("file");
    expect(dirParsed.input.socialSource.kind).toBe("dir");
    expect(dirParsed.output).toContain("social-claimed.json");
    expect(dirParsed.operatorReport.state.state).toBe("claimed");
  });

  test("social-transition creates an attestation when stance is supplied", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-social-attest-"));
    const prepared = await createPreparedMigratedBundle({
      createdAtStart: 1_700_420_700,
    });
    const preparedPath = join(dir, "prepared-executed.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const existingSocial = await cliCreateSocialClaim({
      oldPubkey: deriveSchnorrPublicKey(OLD_SECRET_KEY),
      newPubkey: deriveSchnorrPublicKey(NEW_SECRET_KEY),
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_420_703,
    });
    const socialDir = join(dir, "social");
    await mkdir(socialDir, { recursive: true });
    const socialPath = join(socialDir, "social-claimed.json");
    await writeFile(socialPath, writeSocialBundle(existingSocial), "utf8");

    const fileResult = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--social-bundle",
      socialPath,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--stance",
      "support",
      "--out-dir",
      join(dir, "out-file"),
    ]);
    expect(fileResult.exitCode).toBe(0);
    expect(fileResult.stdout).toContain("command=social-transition");
    expect(fileResult.stdout).toContain("mode=attest");
    expect(fileResult.stdout).toContain("output=");
    expect(fileResult.stdout).toContain("social_attestations=");
    expect(fileResult.stdout).toContain("social_next_action=");

    const dirResult = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--social-bundle-dir",
      socialDir,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--stance",
      "support",
      "--out-dir",
      join(dir, "out-dir"),
      "--json",
    ]);
    expect(dirResult.exitCode).toBe(0);
    const dirParsed = JSON.parse(dirResult.stdout);
    expectSuccessEnvelope(dirParsed, { command: "social-transition", mode: "attest" });
    expect(dirParsed.output).toContain("social-attested.json");
    expect(dirParsed.operatorReport.attestationCount).toBeGreaterThan(0);
  });

  test("social-transition rejects legacy generic social bundle flags", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-social-legacy-"));
    const prepared = await createPreparedMigratedBundle({
      createdAtStart: 1_700_420_800,
    });
    const preparedPath = join(dir, "prepared-executed.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const existingSocial = await cliCreateSocialClaim({
      oldPubkey: deriveSchnorrPublicKey(OLD_SECRET_KEY),
      newPubkey: deriveSchnorrPublicKey(NEW_SECRET_KEY),
      signerSecretKey: OLD_SECRET_KEY,
      createdAt: 1_700_420_803,
    });
    const socialPath = join(dir, "social-claimed.json");
    await writeFile(socialPath, writeSocialBundle(existingSocial), "utf8");

    const claimResult = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--bundle",
      socialPath,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--out-dir",
      join(dir, "claim-out"),
    ]);
    expect(claimResult.exitCode).toBe(1);
    expect(claimResult.stderr).toContain("ERR_FLAG_CONFLICT");
    expect(claimResult.stderr).toContain("--social-bundle");

    const attestResult = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--bundle",
      socialPath,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--stance",
      "support",
      "--out-dir",
      join(dir, "attest-out"),
    ]);
    expect(attestResult.exitCode).toBe(1);
    expect(attestResult.stderr).toContain("ERR_FLAG_CONFLICT");
    expect(attestResult.stderr).toContain("--social-bundle");
  });

  test("social-transition rejects prepared bundles that have not executed yet", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-social-prepared-state-"));
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_250 },
      createdAt: 1_700_421_300,
    });
    const preparedPath = join(dir, "prepared-root.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const result = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--out-dir",
      join(dir, "out"),
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERR_INVALID_PREPARED_STATE");
    expect(result.stderr).toContain("prepared_migrated");
  });

  test("social-transition reports socially split posture when followed observers disagree", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-social-split-"));
    const scenario = await getPathCFixtureScenario("socially-split");
    expect(scenario).toBeDefined();
    const socialDir = join(dir, "social");
    await mkdir(socialDir, { recursive: true });
    const socialPath = join(socialDir, "social-attested.json");
    await writeFile(socialPath, writeSocialBundle(buildSocialBundleFromScenario(scenario!)), "utf8");

    const result = await runCli([
      "social-transition",
      "--social-bundle-dir",
      socialDir,
      "--old-pubkey",
      scenario!.oldPubkey,
      "--new-pubkey",
      scenario!.newPubkey,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--stance",
      "support",
      "--follow-pubkeys",
      scenario!.viewerFollowPubkeys.join(","),
      "--out-dir",
      join(dir, "out"),
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expectSuccessEnvelope(parsed, { command: "social-transition", mode: "attest" });
    expect(parsed.operatorReport.state.state).toBe("socially_split");
    expect(parsed.operatorReport.advice.nextAction).toBe("review_split");
    expect(parsed.operatorReport.supportCount).toBeGreaterThan(0);
    expect(parsed.operatorReport.opposeCount).toBeGreaterThan(0);
  });

  test("workflow commands reject unknown flags", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-prepared-unknown-"));
    const result = await runCli([
      "prepared-migration",
      "--out-dir",
      dir,
      "--old-secret",
      OLD_SECRET_KEY,
      "--migration-secret",
      MIGRATION_SECRET_KEY,
      "--next-migration-secret",
      NEXT_MIGRATION_SECRET_KEY,
      "--new-secret",
      NEW_SECRET_KEY,
      "--root-proof",
      "bitcoin_confirmed",
      "--unknown-flag",
      "x",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERR_UNKNOWN_FLAG");
    expect(result.stderr).toContain("--unknown-flag");
  });

  test("workflow commands reject duplicate singular flags", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-duplicate-flag-"));
    const result = await runCli([
      "prepared-migration",
      "--out-dir",
      dir,
      "--old-secret",
      OLD_SECRET_KEY,
      "--old-secret",
      OLD_SECRET_KEY,
      "--migration-secret",
      MIGRATION_SECRET_KEY,
      "--next-migration-secret",
      NEXT_MIGRATION_SECRET_KEY,
      "--new-secret",
      NEW_SECRET_KEY,
      "--root-proof",
      "bitcoin_confirmed",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERR_FLAG_CONFLICT");
    expect(result.stderr).toContain("--old-secret");
  });

  test("workflow commands reject empty csv inputs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-empty-csv-"));
    const prepared = await createPreparedMigratedBundle({
      createdAtStart: 1_700_420_850,
    });
    const preparedPath = join(dir, "prepared-executed.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const result = await runCli([
      "operate-transition",
      "--prepared-bundle",
      preparedPath,
      "--relays",
      "",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("ERR_INVALID_FLAG_VALUE");
    expect(result.stderr).toContain("--relays");
  });

  test("workflow commands reject malformed pubkeys and secrets early", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-malformed-hex-"));
    const prepared = await createPreparedMigratedBundle({
      createdAtStart: 1_700_420_860,
    });
    const preparedPath = join(dir, "prepared-executed.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const pubkeyResult = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--old-pubkey",
      "not-hex",
      "--new-pubkey",
      deriveSchnorrPublicKey(NEW_SECRET_KEY),
      "--signer-secret",
      OLD_SECRET_KEY,
      "--out-dir",
      join(dir, "social"),
    ]);
    expect(pubkeyResult.exitCode).toBe(1);
    expect(pubkeyResult.stderr).toContain("ERR_INVALID_FLAG_VALUE");
    expect(pubkeyResult.stderr).toContain("--old-pubkey");

    const secretResult = await runCli([
      "prepared-migration",
      "--out-dir",
      join(dir, "prepared"),
      "--old-secret",
      "not-hex",
      "--migration-secret",
      MIGRATION_SECRET_KEY,
      "--next-migration-secret",
      NEXT_MIGRATION_SECRET_KEY,
      "--new-secret",
      NEW_SECRET_KEY,
      "--root-proof",
      "bitcoin_confirmed",
    ]);
    expect(secretResult.exitCode).toBe(1);
    expect(secretResult.stderr).toContain("ERR_INVALID_FLAG_VALUE");
    expect(secretResult.stderr).toContain("--old-secret");
  });

  test("workflow commands reject malformed bundle sources cleanly", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-bad-bundle-"));
    const badPreparedPath = join(dir, "prepared.json");
    const preparedValidPath = join(dir, "prepared-valid.json");
    const badSocialPath = join(dir, "social.json");
    await writeFile(badPreparedPath, "{\"type\":\"wrong\"}", "utf8");
    await writeFile(badSocialPath, "{", "utf8");
    const prepared = await cliPrepare({
      oldSecretKey: OLD_SECRET_KEY,
      migrationSecretKey: MIGRATION_SECRET_KEY,
      proof: { status: "bitcoin_confirmed", anchorHeight: 840_280 },
      createdAt: 1_700_421_500,
    });
    await writeFile(preparedValidPath, writePreparedBundle(prepared), "utf8");

    const preparedResult = await runCli([
      "operate-transition",
      "--prepared-bundle",
      badPreparedPath,
      "--json",
    ]);
    expectJsonFailure(preparedResult, {
      exitCode: 1,
      command: "operate-transition",
      code: "ERR_INVALID_BUNDLE",
    });

    const socialResult = await runCli([
      "operate-transition",
      "--prepared-bundle",
      preparedValidPath,
      "--social-bundle",
      badSocialPath,
      "--json",
    ]);
    expectJsonFailure(socialResult, {
      exitCode: 1,
      command: "operate-transition",
      code: "ERR_INVALID_BUNDLE",
    });
  });

  test("workflow commands reject invalid flag enum values with structured codes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-invalid-enum-"));
    const prepared = await createPreparedMigratedBundle({
      createdAtStart: 1_700_420_870,
    });
    const preparedPath = join(dir, "prepared-executed.json");
    await writeFile(preparedPath, writePreparedBundle(prepared), "utf8");

    const watchResult = await runCli([
      "operate-transition",
      "--prepared-bundle",
      preparedPath,
      "--watch-seconds",
      "nan",
    ]);
    expect(watchResult.exitCode).toBe(1);
    expect(watchResult.stderr).toContain("ERR_INVALID_FLAG_VALUE");

    const stanceResult = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--stance",
      "bad-stance",
      "--out-dir",
      join(dir, "bad-stance"),
    ]);
    expect(stanceResult.exitCode).toBe(1);
    expect(stanceResult.stderr).toContain("ERR_INVALID_FLAG_VALUE");
    expect(stanceResult.stderr).toContain("bad-stance");

    const methodResult = await runCli([
      "social-transition",
      "--prepared-bundle",
      preparedPath,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--stance",
      "support",
      "--method",
      "carrier-pigeon",
      "--out-dir",
      join(dir, "bad-method"),
    ]);
    expect(methodResult.exitCode).toBe(1);
    expect(methodResult.stderr).toContain("ERR_INVALID_FLAG_VALUE");
    expect(methodResult.stderr).toContain("carrier-pigeon");
  });

  test("documented cli walkthrough runs prepared, social, and combined operator flows end to end", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-workflow-smoke-"));
    const preparedDir = join(dir, "prepared");
    const socialDir = join(dir, "social");
    const attestorPubkey = deriveSchnorrPublicKey(ATTESTOR_SECRET_KEY);

    const preparedResult = await runCli([
      "prepared-migration",
      "--old-secret",
      OLD_SECRET_KEY,
      "--migration-secret",
      MIGRATION_SECRET_KEY,
      "--next-migration-secret",
      NEXT_MIGRATION_SECRET_KEY,
      "--new-secret",
      NEW_SECRET_KEY,
      "--root-proof",
      "bitcoin_confirmed",
      "--root-anchor-height",
      "840260",
      "--update-proof",
      "bitcoin_confirmed",
      "--update-anchor-height",
      "840261",
      "--relays",
      "wss://relay.prepared",
      "--out-dir",
      preparedDir,
      "--json",
    ]);
    expect(preparedResult.exitCode).toBe(0);
    const preparedParsed = JSON.parse(preparedResult.stdout);
    expectSuccessEnvelope(preparedParsed, { command: "prepared-migration", mode: "start" });
    expect(preparedParsed.stage).toBe("prepared_migrated");

    const claimResult = await runCli([
      "social-transition",
      "--prepared-bundle-dir",
      preparedDir,
      "--signer-secret",
      OLD_SECRET_KEY,
      "--relays",
      "wss://relay.social",
      "--out-dir",
      socialDir,
      "--json",
    ]);
    expect(claimResult.exitCode).toBe(0);
    const claimParsed = JSON.parse(claimResult.stdout);
    expectSuccessEnvelope(claimParsed, { command: "social-transition", mode: "claim" });
    expect(claimParsed.operatorReport.state.state).toBe("claimed");

    const attestResult = await runCli([
      "social-transition",
      "--prepared-bundle-dir",
      preparedDir,
      "--social-bundle-dir",
      socialDir,
      "--signer-secret",
      ATTESTOR_SECRET_KEY,
      "--stance",
      "support",
      "--follow-pubkeys",
      attestorPubkey,
      "--out-dir",
      socialDir,
      "--json",
    ]);
    expect(attestResult.exitCode).toBe(0);
    const attestParsed = JSON.parse(attestResult.stdout);
    expectSuccessEnvelope(attestParsed, { command: "social-transition", mode: "attest" });
    expect(attestParsed.operatorReport.state.state).toBe("socially_supported");

    const operateResult = await runCli([
      "operate-transition",
      "--prepared-bundle-dir",
      preparedDir,
      "--social-bundle-dir",
      socialDir,
      "--follow-pubkeys",
      attestorPubkey,
      "--json",
    ]);
    expect(operateResult.exitCode).toBe(0);
    const operateParsed = JSON.parse(operateResult.stdout);
    expectSuccessEnvelope(operateParsed, { command: "operate-transition" });
    expect(operateParsed.inspection.prepared.state).toBe("prepared_migrated");
    expect(operateParsed.inspection.social.state).toBe("socially_supported");
    expect(operateParsed.inspection.socialAdvice.nextAction).toBe("review_support");
    expect(operateParsed.input.effectiveRelays).toEqual(["wss://relay.prepared", "wss://relay.social"]);
  });

  test("prepared-migration resumes from the latest saved bundle in a directory and reaches executed state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pubswitch-cli-workflow-resume-dir-"));
    const preparedDir = join(dir, "prepared");

    const initialResult = await runCli([
      "prepared-migration",
      "--old-secret",
      OLD_SECRET_KEY,
      "--migration-secret",
      MIGRATION_SECRET_KEY,
      "--next-migration-secret",
      NEXT_MIGRATION_SECRET_KEY,
      "--new-secret",
      NEW_SECRET_KEY,
      "--root-proof",
      "bitcoin_confirmed",
      "--root-anchor-height",
      "840270",
      "--out-dir",
      preparedDir,
      "--json",
    ]);
    expect(initialResult.exitCode).toBe(0);
    const initialParsed = JSON.parse(initialResult.stdout);
    expectSuccessEnvelope(initialParsed, { command: "prepared-migration", mode: "start" });
    expect(initialParsed.stage).toBe("prepared_enrolled");

    const resumedResult = await runCli([
      "prepared-migration",
      "--bundle-dir",
      preparedDir,
      "--out-dir",
      preparedDir,
      "--old-secret",
      OLD_SECRET_KEY,
      "--current-migration-secret",
      NEXT_MIGRATION_SECRET_KEY,
      "--new-secret",
      NEW_SECRET_KEY,
      "--update-proof",
      "bitcoin_confirmed",
      "--update-anchor-height",
      "840271",
      "--json",
    ]);
    expect(resumedResult.exitCode).toBe(0);
    const resumedParsed = JSON.parse(resumedResult.stdout);
    expectSuccessEnvelope(resumedParsed, { command: "prepared-migration", mode: "resume" });
    expect(resumedParsed.finalState.state).toBe("prepared_migrated");
    expect(resumedParsed.operatorReport.state.state).toBe("prepared_migrated");
  });
});
