import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { assertLowercaseHex32 } from "../packages/protocol-shared/src/index";
import {
  cliContinuePreparedMigration,
  cliCreateSocialAttestation,
  cliCreateSocialClaim,
  cliOperateTransition,
  cliRunPreparedMigrationFlow,
  formatOperateTransitionResult,
  inspectPreparedBundle,
  listPreparedSnapshotNamesDescending,
  listSocialSnapshotNamesDescending,
  resolveSocialTransitionPubkeys,
  summarizePreparedWorkflow,
  summarizeSocialWorkflow,
  type PreparedProofArtifactInput,
  type RelayRuntimeLike,
  readPreparedBundle,
  readSocialBundle,
  writePreparedBundle,
  writeSocialBundle,
} from "./protocol-cli-lib";
import { buildProtocolCliHelpText } from "./protocol-cli-help";
import type { NostrEvent } from "../packages/protocol-shared/src/index";
import type { RelayReceipt, RelaySession } from "./relay-runtime";

type CliErrorCode =
  | "ERR_FLAG_CONFLICT"
  | "ERR_INVALID_BUNDLE"
  | "ERR_INTERNAL"
  | "ERR_INVALID_FLAG_VALUE"
  | "ERR_INVALID_PREPARED_STATE"
  | "ERR_MISSING_FLAG"
  | "ERR_NOT_FULLY_RELAYABLE"
  | "ERR_RELAY_PUBLISH_FAILED"
  | "ERR_SECRET_MISMATCH"
  | "ERR_UNKNOWN_FLAG"
  | "ERR_UNKNOWN_COMMAND"
  | "ERR_WATCH_TIMEOUT";

class CliCommandError extends Error {
  readonly code: CliErrorCode;
  readonly exitCode: number;
  readonly details?: Record<string, unknown>;

  constructor(input: {
    code: CliErrorCode;
    message: string;
    exitCode?: number;
    details?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "CliCommandError";
    this.code = input.code;
    this.exitCode = input.exitCode ?? 1;
    this.details = input.details;
  }
}

async function main(argv: string[]) {
  const [command, ...rest] = argv;

  if (!command || command === "--help") {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case "prepared-migration":
      await handlePreparedMigration(rest);
      break;
    case "social-transition":
      await handleSocialTransition(rest);
      break;
    case "operate-transition":
      await handleOperateTransition(rest);
      break;
    default:
      throw new CliCommandError({
        code: "ERR_UNKNOWN_COMMAND",
        message: `Unknown command: ${command}`,
      });
  }
}

type FlagSpec = {
  expectsValue: boolean;
  allowRepeat?: boolean;
};

const PREPARED_MIGRATION_FLAG_SPECS = {
  "--bundle": { expectsValue: true },
  "--bundle-dir": { expectsValue: true },
  "--created-at-start": { expectsValue: true },
  "--current-migration-secret": { expectsValue: true },
  "--json": { expectsValue: false },
  "--new-secret": { expectsValue: true },
  "--next-migration-secret": { expectsValue: true },
  "--old-secret": { expectsValue: true },
  "--out-dir": { expectsValue: true },
  "--publish": { expectsValue: false },
  "--relays": { expectsValue: true },
  "--require-fully-relayable": { expectsValue: false },
  "--root-anchor-height": { expectsValue: true },
  "--root-proof": { expectsValue: true },
  "--root-proof-event": { expectsValue: true },
  "--root-proof-summary": { expectsValue: true },
  "--migration-secret": { expectsValue: true },
  "--update-anchor-height": { expectsValue: true },
  "--update-proof": { expectsValue: true },
  "--update-proof-event": { expectsValue: true },
  "--update-proof-summary": { expectsValue: true },
  "--watch-seconds": { expectsValue: true },
} satisfies Record<string, FlagSpec>;

const SOCIAL_TRANSITION_FLAG_SPECS = {
  "--bundle": { expectsValue: true },
  "--bundle-dir": { expectsValue: true },
  "--content": { expectsValue: true },
  "--created-at": { expectsValue: true },
  "--follow-pubkeys": { expectsValue: true },
  "--json": { expectsValue: false },
  "--method": { expectsValue: true },
  "--new-pubkey": { expectsValue: true },
  "--old-pubkey": { expectsValue: true },
  "--out": { expectsValue: true },
  "--out-dir": { expectsValue: true },
  "--prepared-bundle": { expectsValue: true },
  "--prepared-bundle-dir": { expectsValue: true },
  "--relays": { expectsValue: true },
  "--signer-secret": { expectsValue: true },
  "--social-bundle": { expectsValue: true },
  "--social-bundle-dir": { expectsValue: true },
  "--stance": { expectsValue: true },
  "--trusted-pubkeys": { expectsValue: true },
} satisfies Record<string, FlagSpec>;

const OPERATE_TRANSITION_FLAG_SPECS = {
  "--follow-pubkeys": { expectsValue: true },
  "--json": { expectsValue: false },
  "--prepared-bundle": { expectsValue: true },
  "--prepared-bundle-dir": { expectsValue: true },
  "--publish": { expectsValue: false },
  "--relays": { expectsValue: true },
  "--require-fully-relayable": { expectsValue: false },
  "--social-bundle": { expectsValue: true },
  "--social-bundle-dir": { expectsValue: true },
  "--trusted-pubkeys": { expectsValue: true },
  "--watch-seconds": { expectsValue: true },
} satisfies Record<string, FlagSpec>;

const argv = Bun.argv.slice(2);
const jsonMode = argv.includes("--json");

try {
  await main(argv);
} catch (error) {
  const [failedCommand] = argv;
  const cliError = normalizeCliError(error);
  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          command: failedCommand,
          error: {
            code: cliError.code,
            message: cliError.message,
            details: cliError.details ?? {},
          },
        },
        null,
        2,
      ),
    );
  } else {
    console.error(`${cliError.code}: ${cliError.message}`);
    if (cliError.code === "ERR_UNKNOWN_COMMAND") {
      printHelp();
    }
  }
  process.exit(cliError.exitCode);
}

async function handlePreparedMigration(args: string[]) {
  validateCommandArgs(args, PREPARED_MIGRATION_FLAG_SPECS, "prepared-migration");
  assertHex32Flag(args, "--old-secret");
  assertHex32Flag(args, "--migration-secret");
  assertHex32Flag(args, "--current-migration-secret");
  assertHex32Flag(args, "--next-migration-secret");
  assertHex32Flag(args, "--new-secret");
  const bundleSource = resolveBundleSourceArgs(args, "--bundle", "--bundle-dir", "prepared-migration");
  if (bundleSource.path) {
    await handleContinuePreparedMigration(args, "prepared-migration", true);
    return;
  }

  await handleRunPreparedMigration(args, "prepared-migration", true);
}

async function handleRunPreparedMigration(
  args: string[],
  commandName = "prepared-migration",
  emitMode = false,
) {
  const outDir = requiredFlag(args, "--out-dir");
  await mkdir(outDir, { recursive: true });

  const rootProofArtifact = await readPreparedProofArtifact(args, "--root-proof-event", "--root-proof-summary");
  const rootProofStatus = readFlag(args, "--root-proof");
  if (rootProofArtifact && rootProofStatus) {
    throw new Error(`${commandName} accepts either imported root proof artifacts or --root-proof, not both`);
  }

  const updateProofArtifact = await readPreparedProofArtifact(args, "--update-proof-event", "--update-proof-summary");
  const updateProofStatus = readFlag(args, "--update-proof");
  if (updateProofArtifact && updateProofStatus) {
    throw new Error(`${commandName} accepts either imported update proof artifacts or --update-proof, not both`);
  }

  const result = await cliRunPreparedMigrationFlow({
    oldSecretKey: requiredFlag(args, "--old-secret"),
    migrationSecretKey: requiredFlag(args, "--migration-secret"),
    nextMigrationSecretKey: requiredFlag(args, "--next-migration-secret"),
    newSecretKey: requiredFlag(args, "--new-secret"),
    rootProofArtifact,
    rootProof: rootProofStatus
      ? {
          status: asProofStatus(rootProofStatus),
          anchorHeight: optionalNumber(readFlag(args, "--root-anchor-height")),
        }
      : undefined,
    updateProofArtifact,
    updateProof: updateProofStatus
      ? {
          status: asProofStatus(updateProofStatus),
          anchorHeight: optionalNumber(readFlag(args, "--update-anchor-height")),
        }
      : undefined,
    createdAtStart: optionalNumber(readFlag(args, "--created-at-start")),
    relays: readListFlag(args, "--relays"),
    publish: args.includes("--publish"),
    requireFullyRelayReplayable: args.includes("--require-fully-relayable"),
    watchSeconds: optionalNumber(readFlag(args, "--watch-seconds")),
    relayRuntime: resolveRelayRuntimeForTests({
      preparedBundle: undefined,
      socialBundle: undefined,
    }),
  });

  const preparedPath = `${outDir}/prepared-root.json`;
  await writeFile(preparedPath, writePreparedBundle(result.preparedBundle), "utf8");
  let updatedPath: string | undefined;
  let executedPath: string | undefined;

  if (result.updatedBundle) {
    updatedPath = `${outDir}/prepared-updated.json`;
    await writeFile(updatedPath, writePreparedBundle(result.updatedBundle), "utf8");
  }

  if (result.executedBundle) {
    executedPath = `${outDir}/prepared-executed.json`;
    await writeFile(executedPath, writePreparedBundle(result.executedBundle), "utf8");
  }
  const operatorReport = summarizePreparedWorkflow(result.executedBundle ?? result.updatedBundle ?? result.preparedBundle);
  const warning = result.publishResult?.warnings ?? compactWarnings(result.publishResult?.warning);
  maybeThrowRelayCommandFailure({
    commandName: "prepared-migration",
    publishResult: result.publishResult,
    watchResult: result.watchResult,
    details: {
      outputs: {
        prepared: preparedPath,
        updated: updatedPath,
        executed: executedPath,
      },
    },
  });

  if (args.includes("--json")) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          command: "prepared-migration",
          ...(emitMode ? { mode: "start" } : {}),
          input: {
            oldSecretProvided: hasFlag(args, "--old-secret"),
            migrationSecretProvided: hasFlag(args, "--migration-secret"),
            nextMigrationSecretProvided: hasFlag(args, "--next-migration-secret"),
            newSecretProvided: hasFlag(args, "--new-secret"),
            publish: args.includes("--publish"),
            watchSeconds: optionalNumber(readFlag(args, "--watch-seconds")),
            relays: readListFlag(args, "--relays") ?? [],
          },
          stage: result.stage,
          stopReason: result.stopReason,
          preparedState: result.preparedState,
          updatedState: result.updatedState,
          executedState: result.executedState,
          outputs: {
            prepared: preparedPath,
            updated: updatedPath,
            executed: executedPath,
          },
          operatorReport,
          warning,
          publishResult: result.publishResult,
          watchResult: result.watchResult,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`command=prepared-migration`);
  if (emitMode) {
    console.log(`mode=start`);
  }
  console.log(`stage=${result.stage}`);
  console.log(`prepared_bundle=${preparedPath}`);
  if (updatedPath) {
    console.log(`updated_bundle=${updatedPath}`);
  }
  if (executedPath) {
    console.log(`executed_bundle=${executedPath}`);
  }
  console.log(`prepared_state=${result.preparedState.state}`);
  if (result.updatedState) {
    console.log(`updated_state=${result.updatedState.state}`);
  }
  if (result.executedState) {
    console.log(`executed_state=${result.executedState.state}`);
  }
  if (result.stopReason) {
    console.log(`stop_reason=${result.stopReason}`);
  }
  console.log(`next_action=${operatorReport.advice.nextAction}`);
  console.log(`next_action_summary=${operatorReport.advice.summary}`);
  if (operatorReport.advice.targetEventId) {
    console.log(`next_action_target=${operatorReport.advice.targetEventId}`);
  }
  if (operatorReport.advice.missingInputs.length > 0) {
    console.log(`missing_inputs=${operatorReport.advice.missingInputs.join(",")}`);
  }
  console.log(`relay_status=${operatorReport.relayReport.relayStatus}`);
  console.log(`publishable_events=${operatorReport.relayReport.publishableEventCount}`);
  console.log(`publishable_proofs=${operatorReport.relayReport.publishableProofCount}`);
  if (operatorReport.relayReport.localOnlyProofTargets.length > 0) {
    console.log(`local_only_proof_targets=${operatorReport.relayReport.localOnlyProofTargets.join(",")}`);
  }
  if (result.publishResult) {
    console.log(`published_events=${result.publishResult.entries.length}`);
    if (result.publishResult.preparedRelayReport) {
      console.log(`publish_relay_status=${result.publishResult.preparedRelayReport.relayStatus}`);
    }
    if (result.publishResult.warning) {
      console.log(`publish_warning=${result.publishResult.warning}`);
    }
  }
  if (result.watchResult) {
    console.log(`watched_events=${result.watchResult.observedEvents.length}`);
    console.log(`watch_final_state=${result.watchResult.finalState?.state ?? "none"}`);
  }
}

async function handleContinuePreparedMigration(
  args: string[],
  commandName = "prepared-migration",
  emitMode = false,
) {
  const outDir = requiredFlag(args, "--out-dir");
  await mkdir(outDir, { recursive: true });

  const rootProofArtifact = await readPreparedProofArtifact(args, "--root-proof-event", "--root-proof-summary");
  const rootProofStatus = readFlag(args, "--root-proof");
  if (rootProofArtifact && rootProofStatus) {
    throw new Error(`${commandName} accepts either imported root proof artifacts or --root-proof, not both`);
  }

  const updateProofArtifact = await readPreparedProofArtifact(args, "--update-proof-event", "--update-proof-summary");
  const updateProofStatus = readFlag(args, "--update-proof");
  if (updateProofArtifact && updateProofStatus) {
    throw new Error(`${commandName} accepts either imported update proof artifacts or --update-proof, not both`);
  }

  const bundleSource = await resolvePreparedContinuationSource(args, commandName);
  const result = await cliContinuePreparedMigration({
    bundle: readPreparedBundle(await readFile(bundleSource.path, "utf8")),
    oldSecretKey: readFlag(args, "--old-secret"),
    currentMigrationSecretKey: readFlag(args, "--current-migration-secret"),
    nextMigrationSecretKey: readFlag(args, "--next-migration-secret"),
    newSecretKey: readFlag(args, "--new-secret"),
    rootProofArtifact,
    rootProof: rootProofStatus
      ? {
          status: asProofStatus(rootProofStatus),
          anchorHeight: optionalNumber(readFlag(args, "--root-anchor-height")),
        }
      : undefined,
    updateProofArtifact,
    updateProof: updateProofStatus
      ? {
          status: asProofStatus(updateProofStatus),
          anchorHeight: optionalNumber(readFlag(args, "--update-anchor-height")),
        }
      : undefined,
    relays: readListFlag(args, "--relays"),
    publish: args.includes("--publish"),
    requireFullyRelayReplayable: args.includes("--require-fully-relayable"),
    watchSeconds: optionalNumber(readFlag(args, "--watch-seconds")),
    relayRuntime: resolveRelayRuntimeForTests({
      preparedBundle: readPreparedBundle(await readFile(bundleSource.path, "utf8")),
      socialBundle: undefined,
    }),
  });

  if (result.stopReason?.includes("active migration pubkey does not match any provided migration secret")) {
    throw new CliCommandError({
      code: "ERR_SECRET_MISMATCH",
      message: result.stopReason,
    });
  }

  const outputs = Object.fromEntries(
    await Promise.all(
      result.snapshots.map(async (snapshot, index) => {
        const path = `${outDir}/${String(index).padStart(2, "0")}-${snapshot.label}.json`;
        await writeFile(path, writePreparedBundle(snapshot.bundle), "utf8");
        return [snapshot.label, path];
      }),
    ),
  );
  const operatorReport = summarizePreparedWorkflow(result.finalBundle);
  const warning = result.publishResult?.warnings ?? compactWarnings(result.publishResult?.warning);
  maybeThrowRelayCommandFailure({
    commandName: "prepared-migration",
    publishResult: result.publishResult,
    watchResult: result.watchResult,
    details: {
      bundleSource: bundleSource.path,
      outputs,
    },
  });

  if (args.includes("--json")) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          command: "prepared-migration",
          ...(emitMode ? { mode: "resume" } : {}),
          input: {
            oldSecretProvided: hasFlag(args, "--old-secret"),
            currentMigrationSecretProvided: hasFlag(args, "--current-migration-secret"),
            nextMigrationSecretProvided: hasFlag(args, "--next-migration-secret"),
            newSecretProvided: hasFlag(args, "--new-secret"),
            publish: args.includes("--publish"),
            watchSeconds: optionalNumber(readFlag(args, "--watch-seconds")),
            relays: readListFlag(args, "--relays") ?? [],
          },
          bundleSource: bundleSource.path,
          finalState: result.finalState,
          stopReason: result.stopReason,
          outputs,
          operatorReport,
          warning,
          publishResult: result.publishResult,
          watchResult: result.watchResult,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`command=prepared-migration`);
  if (emitMode) {
    console.log(`mode=resume`);
  }
  console.log(`bundle_source=${bundleSource.path}`);
  console.log(`final_state=${result.finalState.state}`);
  for (const snapshot of result.snapshots) {
    console.log(`${snapshot.label}=${outputs[snapshot.label]}`);
  }
  if (result.stopReason) {
    console.log(`stop_reason=${result.stopReason}`);
  }
  console.log(`next_action=${operatorReport.advice.nextAction}`);
  console.log(`next_action_summary=${operatorReport.advice.summary}`);
  if (operatorReport.advice.targetEventId) {
    console.log(`next_action_target=${operatorReport.advice.targetEventId}`);
  }
  if (operatorReport.advice.missingInputs.length > 0) {
    console.log(`missing_inputs=${operatorReport.advice.missingInputs.join(",")}`);
  }
  console.log(`relay_status=${operatorReport.relayReport.relayStatus}`);
  console.log(`publishable_events=${operatorReport.relayReport.publishableEventCount}`);
  console.log(`publishable_proofs=${operatorReport.relayReport.publishableProofCount}`);
  if (operatorReport.relayReport.localOnlyProofTargets.length > 0) {
    console.log(`local_only_proof_targets=${operatorReport.relayReport.localOnlyProofTargets.join(",")}`);
  }
  if (result.publishResult) {
    console.log(`published_events=${result.publishResult.entries.length}`);
    if (result.publishResult.preparedRelayReport) {
      console.log(`publish_relay_status=${result.publishResult.preparedRelayReport.relayStatus}`);
    }
    if (result.publishResult.warning) {
      console.log(`publish_warning=${result.publishResult.warning}`);
    }
  }
  if (result.watchResult) {
    console.log(`watched_events=${result.watchResult.observedEvents.length}`);
    console.log(`watch_final_state=${result.watchResult.finalState?.state ?? "none"}`);
  }
}

async function handleSocialTransition(args: string[]) {
  validateCommandArgs(args, SOCIAL_TRANSITION_FLAG_SPECS, "social-transition");
  assertHex32Flag(args, "--old-pubkey");
  assertHex32Flag(args, "--new-pubkey");
  assertHex32Flag(args, "--signer-secret");
  readHexSetFlag(args, "--follow-pubkeys");
  readHexSetFlag(args, "--trusted-pubkeys");
  const stance = readFlag(args, "--stance");
  const mode = stance ? "attest" : "claim";
  const commandName = "social-transition";
  const out = await resolveOutputPath(
    args,
    commandName,
    mode === "claim" ? "social-claimed.json" : "social-attested.json",
  );
  const json = args.includes("--json");
  assertNoLegacySocialBundleFlags(args, commandName);
  const existing = await readOptionalSocialBundleSource(
    args,
    "--social-bundle",
    "--social-bundle-dir",
    commandName,
  );
  const preparedBundle = await readOptionalPreparedBundleSource(
    args,
    "--prepared-bundle",
    "--prepared-bundle-dir",
    commandName,
  );
  const transition = resolveSocialTransitionPubkeys({
    preparedBundle,
    socialBundle: existing,
    oldPubkey: readFlag(args, "--old-pubkey"),
    newPubkey: readFlag(args, "--new-pubkey"),
  });
  const signerSecretKey = requiredFlag(args, "--signer-secret");
  const content = readFlag(args, "--content");
  const createdAt = optionalNumber(readFlag(args, "--created-at"));
  const relays = readListFlag(args, "--relays");
  const bundle =
    mode === "claim"
      ? await cliCreateSocialClaim({
          oldPubkey: transition.oldPubkey,
          newPubkey: transition.newPubkey,
          signerSecretKey,
          content,
          createdAt,
          bundle: existing,
          relays,
        })
      : await cliCreateSocialAttestation({
          oldPubkey: transition.oldPubkey,
          newPubkey: transition.newPubkey,
          signerSecretKey,
          stance: asStance(stance),
          method: asOptionalMethod(readFlag(args, "--method")),
          content,
          createdAt,
          bundle: existing,
          relays,
        });

  await writeFile(out, writeSocialBundle(bundle), "utf8");
  const operatorReport = await summarizeSocialWorkflow({
    socialBundle: bundle,
    viewerFollowSet: readHexSetFlag(args, "--follow-pubkeys"),
    viewerTrustedSet: readHexSetFlag(args, "--trusted-pubkeys"),
  });
  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          command: "social-transition",
          mode,
          input: {
            preparedSource: readBundleSourceForOutput(args, "--prepared-bundle", "--prepared-bundle-dir"),
            socialSource: readBundleSourceForOutput(args, "--social-bundle", "--social-bundle-dir"),
            signerSecretProvided: hasFlag(args, "--signer-secret"),
            relays: readListFlag(args, "--relays") ?? [],
          },
          output: out,
          operatorReport,
          warning: [],
        },
        null,
        2,
      ),
    );
    return;
  }
  console.log(`command=social-transition`);
  console.log(`mode=${mode}`);
  console.log(`output=${out}`);
  printSocialBundleSummary(operatorReport);
}

async function handleOperateTransition(args: string[]) {
  validateCommandArgs(args, OPERATE_TRANSITION_FLAG_SPECS, "operate-transition");
  readHexSetFlag(args, "--follow-pubkeys");
  readHexSetFlag(args, "--trusted-pubkeys");
  const json = args.includes("--json");
  const preparedSource = await readRequiredPreparedBundleInput(
    args,
    "--prepared-bundle",
    "--prepared-bundle-dir",
    "operate-transition",
  );
  const socialSource = await readOptionalSocialBundleInput(
    args,
    "--social-bundle",
    "--social-bundle-dir",
    "operate-transition",
  );
  const result = await cliOperateTransition({
    preparedBundle: preparedSource.bundle,
    socialBundle: socialSource?.bundle,
    viewerFollowSet: readHexSetFlag(args, "--follow-pubkeys"),
    viewerTrustedSet: readHexSetFlag(args, "--trusted-pubkeys"),
    relays: readListFlag(args, "--relays"),
    publish: args.includes("--publish"),
    watchSeconds: optionalNumber(readFlag(args, "--watch-seconds")),
    requireFullyRelayReplayable: args.includes("--require-fully-relayable"),
    relayRuntime: resolveRelayRuntimeForTests({
      preparedBundle: preparedSource.bundle,
      socialBundle: socialSource?.bundle,
    }),
  });
  maybeThrowRelayCommandFailure({
    commandName: "operate-transition",
    publishResult: result.publishResult,
    watchResult: result.watchResult,
  });

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          command: "operate-transition",
          input: {
            preparedSource: preparedSource.source,
            socialSource: socialSource?.source,
            effectiveRelays: result.input.effectiveRelays,
            publish: result.input.publish,
            watchSeconds: result.input.watchSeconds,
          },
          inspection: result.inspection,
          warning: result.publishResult?.warnings ?? compactWarnings(result.publishResult?.warning),
          publishResult: result.publishResult,
          watchResult: result.watchResult,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(formatOperateTransitionResult(result));
}

function requiredFlag(args: string[], name: string): string {
  const value = readFlag(args, name);
  if (!value) {
    throw new CliCommandError({
      code: "ERR_MISSING_FLAG",
      message: `missing required flag ${name}`,
      details: { flag: name },
    });
  }
  return value;
}

function readFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function validateCommandArgs(
  args: string[],
  specs: Record<string, FlagSpec>,
  commandName: string,
) {
  const seen = new Map<string, number>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new CliCommandError({
        code: "ERR_UNKNOWN_FLAG",
        message: `${commandName} does not accept positional argument ${arg}`,
        details: { command: commandName, value: arg },
      });
    }

    const spec = specs[arg];
    if (!spec) {
      throw new CliCommandError({
        code: "ERR_UNKNOWN_FLAG",
        message: `${commandName} does not support flag ${arg}`,
        details: { command: commandName, flag: arg },
      });
    }

    const count = (seen.get(arg) ?? 0) + 1;
    seen.set(arg, count);
    if (count > 1 && !spec.allowRepeat) {
      throw new CliCommandError({
        code: "ERR_FLAG_CONFLICT",
        message: `${commandName} does not accept repeated ${arg}`,
        details: { command: commandName, flag: arg },
      });
    }

    if (!spec.expectsValue) {
      continue;
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new CliCommandError({
        code: "ERR_MISSING_FLAG",
        message: `${arg} requires a value`,
        details: { command: commandName, flag: arg },
      });
    }
    index += 1;
  }
}

function readListFlag(args: string[], name: string): string[] | undefined {
  const value = readFlag(args, name);
  if (value === undefined) {
    return undefined;
  }

  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) {
    throw new CliCommandError({
      code: "ERR_INVALID_FLAG_VALUE",
      message: `${name} requires one or more comma-separated values`,
      details: { flag: name, value },
    });
  }
  return entries;
}

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CliCommandError({
      code: "ERR_INVALID_FLAG_VALUE",
      message: `expected numeric value, got ${value}`,
      details: { value },
    });
  }

  return parsed;
}

function asProofStatus(value: string): "pending" | "bitcoin_confirmed" {
  if (value === "pending" || value === "bitcoin_confirmed") {
    return value;
  }
  throw new CliCommandError({
    code: "ERR_INVALID_FLAG_VALUE",
    message: `unsupported proof status: ${value}`,
    details: { value },
  });
}

function asStance(value: string): "support" | "oppose" | "uncertain" {
  if (value === "support" || value === "oppose" || value === "uncertain") {
    return value;
  }
  throw new CliCommandError({
    code: "ERR_INVALID_FLAG_VALUE",
    message: `unsupported stance: ${value}`,
    details: { value },
  });
}

function asOptionalMethod(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  if (["in_person", "video", "voice", "website", "nip05", "chat", "other"].includes(value)) {
    return value as "in_person" | "video" | "voice" | "website" | "nip05" | "chat" | "other";
  }

  throw new CliCommandError({
    code: "ERR_INVALID_FLAG_VALUE",
    message: `unsupported method: ${value}`,
    details: { value },
  });
}

function assertNoLegacySocialBundleFlags(args: string[], commandName: string) {
  if (hasFlag(args, "--bundle") || hasFlag(args, "--bundle-dir")) {
    throw new CliCommandError({
      code: "ERR_FLAG_CONFLICT",
      message: `${commandName} now uses --social-bundle or --social-bundle-dir for existing social evidence`,
      details: { command: commandName },
    });
  }
}

async function readOptionalSocialBundleSource(
  args: string[],
  fileFlag = "--social-bundle",
  dirFlag = "--social-bundle-dir",
  commandName = "command",
) {
  const source = resolveBundleSourceArgs(args, fileFlag, dirFlag, commandName);
  if (!source.path) {
    return undefined;
  }

  const path = source.path.endsWith("/") ? await resolveLatestSocialSnapshotPath(source.path.slice(0, -1)) : source.path;
  return readSocialBundle(await readFile(path, "utf8"));
}

async function readOptionalSocialBundleInput(
  args: string[],
  fileFlag = "--social-bundle",
  dirFlag = "--social-bundle-dir",
  commandName = "command",
) {
  const source = resolveBundleSourceArgs(args, fileFlag, dirFlag, commandName);
  if (!source.path) {
    return undefined;
  }

  const kind = source.path.endsWith("/") ? "dir" : "file";
  const path = source.path.endsWith("/") ? await resolveLatestSocialSnapshotPath(source.path.slice(0, -1)) : source.path;
  return {
    bundle: readSocialBundle(await readFile(path, "utf8")),
    source: {
      kind,
      path: kind === "dir" ? source.path.slice(0, -1) : source.path,
    },
  };
}

async function resolvePreparedContinuationSource(
  args: string[],
  commandName = "prepared-migration",
): Promise<{ path: string }> {
  const source = resolveBundleSourceArgs(args, "--bundle", "--bundle-dir", commandName);
  if (!source.path) {
    throw new Error(`${commandName} requires --bundle or --bundle-dir`);
  }
  return source.path.endsWith("/") ? { path: await resolveLatestPreparedSnapshotPath(source.path.slice(0, -1)) } : { path: source.path };
}

function resolveBundleSourceArgs(
  args: string[],
  fileFlag: string,
  dirFlag: string,
  commandName: string,
): { path?: string } {
  const bundlePath = readFlag(args, fileFlag);
  const bundleDir = readFlag(args, dirFlag);
  if (bundlePath && bundleDir) {
    throw new CliCommandError({
      code: "ERR_FLAG_CONFLICT",
      message: `${commandName} accepts either ${fileFlag} or ${dirFlag}, not both`,
      details: { command: commandName, fileFlag, dirFlag },
    });
  }
  if (bundlePath) {
    return { path: bundlePath };
  }
  if (!bundleDir) {
    return {};
  }
  return { path: `${bundleDir}/` };
}

async function readOptionalPreparedBundleSource(
  args: string[],
  fileFlag = "--prepared-bundle",
  dirFlag = "--prepared-bundle-dir",
  commandName = "command",
  dirPredicate?: (bundle: ReturnType<typeof readPreparedBundle>) => boolean,
) {
  const source = resolveBundleSourceArgs(args, fileFlag, dirFlag, commandName);
  if (!source.path) {
    return undefined;
  }

  const path = source.path.endsWith("/")
    ? await resolveLatestPreparedSnapshotPath(source.path.slice(0, -1), dirPredicate)
    : source.path;
  return readPreparedBundle(await readFile(path, "utf8"));
}

async function readRequiredPreparedBundleSource(
  args: string[],
  fileFlag: string,
  dirFlag: string,
  commandName: string,
  dirPredicate?: (bundle: ReturnType<typeof readPreparedBundle>) => boolean,
) {
  const bundle = await readOptionalPreparedBundleSource(args, fileFlag, dirFlag, commandName, dirPredicate);
  if (!bundle) {
    throw new CliCommandError({
      code: "ERR_MISSING_FLAG",
      message: `${commandName} requires ${fileFlag} or ${dirFlag}`,
      details: { command: commandName, fileFlag, dirFlag },
    });
  }
  return bundle;
}

async function readRequiredPreparedBundleInput(
  args: string[],
  fileFlag: string,
  dirFlag: string,
  commandName: string,
) {
  const source = resolveBundleSourceArgs(args, fileFlag, dirFlag, commandName);
  if (!source.path) {
    throw new CliCommandError({
      code: "ERR_MISSING_FLAG",
      message: `${commandName} requires ${fileFlag} or ${dirFlag}`,
      details: { command: commandName, fileFlag, dirFlag },
    });
  }

  const kind = source.path.endsWith("/") ? "dir" : "file";
  const path = source.path.endsWith("/") ? await resolveLatestPreparedSnapshotPath(source.path.slice(0, -1)) : source.path;
  return {
    bundle: readPreparedBundle(await readFile(path, "utf8")),
    source: {
      kind,
      path: kind === "dir" ? source.path.slice(0, -1) : source.path,
    },
  };
}

async function resolveLatestPreparedSnapshotPath(
  bundleDir: string,
  predicate?: (bundle: ReturnType<typeof readPreparedBundle>) => boolean,
): Promise<string> {
  const snapshotNames = predicate
    ? await filterPreparedSnapshotNames(bundleDir, predicate)
    : listPreparedSnapshotNamesDescending(await readdir(bundleDir));
  const snapshotName = snapshotNames.at(0);
  if (!snapshotName) {
    throw new CliCommandError({
      code: "ERR_INVALID_PREPARED_STATE",
      message: predicate
        ? `found no compatible prepared snapshot bundles in ${bundleDir}`
        : `prepared-migration found no saved snapshot bundles in ${bundleDir}`,
      details: { bundleDir },
    });
  }

  return `${bundleDir}/${snapshotName}`;
}

async function resolveLatestSocialSnapshotPath(bundleDir: string): Promise<string> {
  const snapshotName = listSocialSnapshotNamesDescending(await readdir(bundleDir)).at(0);
  if (!snapshotName) {
    throw new CliCommandError({
      code: "ERR_INVALID_PREPARED_STATE",
      message: `found no saved social snapshot bundles in ${bundleDir}`,
      details: { bundleDir },
    });
  }
  return `${bundleDir}/${snapshotName}`;
}

async function filterPreparedSnapshotNames(
  bundleDir: string,
  predicate: (bundle: ReturnType<typeof readPreparedBundle>) => boolean,
) {
  const matchingNames: string[] = [];
  for (const snapshotName of listPreparedSnapshotNamesDescending(await readdir(bundleDir))) {
    const bundle = readPreparedBundle(await readFile(`${bundleDir}/${snapshotName}`, "utf8"));
    if (predicate(bundle)) {
      matchingNames.push(snapshotName);
    }
  }
  return matchingNames;
}

async function readPreparedProofArtifact(
  args: string[],
  proofEventFlag = "--proof-event",
  proofSummaryFlag = "--proof-summary",
): Promise<PreparedProofArtifactInput | undefined> {
  const proofEventPath = readFlag(args, proofEventFlag);
  const proofSummaryPath = readFlag(args, proofSummaryFlag);

  if (!proofEventPath && !proofSummaryPath) {
    return undefined;
  }

  const artifact: PreparedProofArtifactInput = {};
  if (proofEventPath) {
    artifact.otsEvent = JSON.parse(await readFile(proofEventPath, "utf8"));
  }

  if (proofSummaryPath) {
    artifact.summary = JSON.parse(await readFile(proofSummaryPath, "utf8"));
  }

  return artifact;
}

function maybeThrowRelayCommandFailure(input: {
  commandName: string;
  publishResult?: {
    failedEntries: Array<{ step: string; eventId?: string; kind: number }>;
  };
  watchResult?: {
    timedOut: boolean;
    missingEventIds: string[];
  };
  details?: Record<string, unknown>;
}) {
  if (input.publishResult && input.publishResult.failedEntries.length > 0) {
    throw new CliCommandError({
      code: "ERR_RELAY_PUBLISH_FAILED",
      message: `${input.commandName} did not receive any accepting relay receipts for ${input.publishResult.failedEntries.length} published event(s)`,
      exitCode: 2,
      details: {
        ...(input.details ?? {}),
        failedEntries: input.publishResult.failedEntries,
      },
    });
  }

  if (input.watchResult?.timedOut) {
    throw new CliCommandError({
      code: "ERR_WATCH_TIMEOUT",
      message: `${input.commandName} timed out waiting for relay observation of ${input.watchResult.missingEventIds.length} event(s)`,
      exitCode: 2,
      details: {
        ...(input.details ?? {}),
        missingEventIds: input.watchResult.missingEventIds,
      },
    });
  }
}

async function resolveOutputPath(
  args: string[],
  commandName: string,
  defaultFilename: string,
) {
  const out = readFlag(args, "--out");
  const outDir = readFlag(args, "--out-dir");
  if (out && outDir) {
    throw new CliCommandError({
      code: "ERR_FLAG_CONFLICT",
      message: `${commandName} accepts either --out or --out-dir, not both`,
      details: { command: commandName, out, outDir },
    });
  }
  if (out) {
    return out;
  }
  if (!outDir) {
    throw new CliCommandError({
      code: "ERR_MISSING_FLAG",
      message: `${commandName} requires --out or --out-dir`,
      details: { command: commandName },
    });
  }
  await mkdir(outDir, { recursive: true });
  return `${outDir}/${defaultFilename}`;
}

function normalizeCliError(error: unknown): CliCommandError {
  if (error instanceof CliCommandError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("not fully relay-replayable")) {
    return new CliCommandError({
      code: "ERR_NOT_FULLY_RELAYABLE",
      message,
    });
  }

  if (message.includes("active migration pubkey does not match any provided migration secret")) {
    return new CliCommandError({
      code: "ERR_SECRET_MISMATCH",
      message,
    });
  }

  if (message.includes("social commands can only derive transition pubkeys from a prepared_migrated bundle")) {
    return new CliCommandError({
      code: "ERR_INVALID_PREPARED_STATE",
      message,
    });
  }

  if (message.includes("timed out waiting for relay observation")) {
    return new CliCommandError({
      code: "ERR_WATCH_TIMEOUT",
      message,
      exitCode: 2,
    });
  }

  if (message.includes("accepting relay receipts")) {
    return new CliCommandError({
      code: "ERR_RELAY_PUBLISH_FAILED",
      message,
      exitCode: 2,
    });
  }

  if (message.startsWith("Unknown command:")) {
    return new CliCommandError({
      code: "ERR_UNKNOWN_COMMAND",
      message,
    });
  }

  if (
    message.includes("prepared bundle") ||
    message.includes("social bundle") ||
    message.includes("saved snapshot bundles") ||
    message.includes("social snapshot bundles")
  ) {
    return new CliCommandError({
      code: "ERR_INVALID_BUNDLE",
      message,
    });
  }

  return new CliCommandError({
    code: "ERR_INTERNAL",
    message,
    exitCode: 3,
  });
}

function resolveRelayRuntimeForTests(input: {
  preparedBundle?: ReturnType<typeof readPreparedBundle>;
  socialBundle?: ReturnType<typeof readSocialBundle>;
}): RelayRuntimeLike | undefined {
  const mode = process.env.PUBSWITCH_TEST_RELAY_MODE;
  if (!mode) {
    return undefined;
  }

  const defaultRelays = ["wss://relay.test.one", "wss://relay.test.two"];
  const observedEvents = mode === "watch-observed" ? collectBundleEvents(input.preparedBundle, input.socialBundle) : [];

  return {
    async openRelaySession(args: {
      relays?: string[];
      onEvent?: (event: NostrEvent) => void | Promise<void>;
    }): Promise<RelaySession> {
      const relays = args.relays && args.relays.length > 0 ? args.relays : defaultRelays;
      const session: RelaySession = {
        relays,
        sockets: new Map(),
        statuses: new Map(),
        receipts: [],
        seenEventIds: new Set(observedEvents.map((event) => event.id!).filter(Boolean)),
        observedEvents: [...observedEvents],
        close() {},
      };

      for (const event of observedEvents) {
        await args.onEvent?.(event);
      }

      return session;
    },
    async publishEvent(session: RelaySession, event: NostrEvent): Promise<RelayReceipt[]> {
      const receipts =
        mode === "publish-fail"
          ? []
          : mode === "publish-partial"
            ? [
                {
                  eventId: event.id!,
                  relayUrl: session.relays[0]!,
                  accepted: true,
                  message: "accepted",
                  receivedAt: 1_700_500_000,
                },
              ]
            : session.relays.map((relayUrl) => ({
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

function collectBundleEvents(
  preparedBundle?: ReturnType<typeof readPreparedBundle>,
  socialBundle?: ReturnType<typeof readSocialBundle>,
) {
  return [
    ...(preparedBundle?.events ?? []),
    ...(preparedBundle?.otsProofs.flatMap((proof) => (proof.otsEvent ? [proof.otsEvent] : [])) ?? []),
    ...(socialBundle?.events ?? []),
  ];
}

function assertHex32Flag(args: string[], name: string) {
  const value = readFlag(args, name);
  if (value === undefined) {
    return;
  }

  try {
    assertLowercaseHex32(value, name);
  } catch (error) {
    throw new CliCommandError({
      code: "ERR_INVALID_FLAG_VALUE",
      message: error instanceof Error ? error.message : `${name} must be 32-byte lowercase hex`,
      details: { flag: name, value },
    });
  }
}

function printHelp() {
  console.log(buildProtocolCliHelpText());
}

function readHexSetFlag(args: string[], name: string) {
  const values = readListFlag(args, name);
  if (!values) {
    return undefined;
  }

  for (const value of values) {
    try {
      assertLowercaseHex32(value, name);
    } catch (error) {
      throw new CliCommandError({
        code: "ERR_INVALID_FLAG_VALUE",
        message: error instanceof Error ? error.message : `${name} must be 32-byte lowercase hex`,
        details: { flag: name, value },
      });
    }
  }

  return new Set(values);
}

function readBundleSourceForOutput(args: string[], fileFlag: string, dirFlag: string) {
  const path = readFlag(args, fileFlag);
  if (path) {
    return { kind: "file", path } as const;
  }

  const dir = readFlag(args, dirFlag);
  if (dir) {
    return { kind: "dir", path: dir } as const;
  }

  return undefined;
}

function compactWarnings(...values: Array<string | undefined>) {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function printPreparedBundleSummary(operatorReport: ReturnType<typeof summarizePreparedWorkflow>) {
  console.log(`prepared_state=${operatorReport.state.state}`);
  console.log(`next_action=${operatorReport.advice.nextAction}`);
  console.log(`next_action_summary=${operatorReport.advice.summary}`);
  if (operatorReport.advice.targetEventId) {
    console.log(`next_action_target=${operatorReport.advice.targetEventId}`);
  }
  if (operatorReport.advice.missingInputs.length > 0) {
    console.log(`missing_inputs=${operatorReport.advice.missingInputs.join(",")}`);
  }
  console.log(`relay_status=${operatorReport.relayReport.relayStatus}`);
  console.log(`publishable_events=${operatorReport.relayReport.publishableEventCount}`);
  console.log(`publishable_proofs=${operatorReport.relayReport.publishableProofCount}`);
  if (operatorReport.relayReport.localOnlyProofTargets.length > 0) {
    console.log(`local_only_proof_targets=${operatorReport.relayReport.localOnlyProofTargets.join(",")}`);
  }
}

function printSocialBundleSummary(operatorReport: Awaited<ReturnType<typeof summarizeSocialWorkflow>>) {
  console.log(`social_state=${operatorReport.state.state}`);
  console.log(`social_claims=${operatorReport.claimCount}`);
  console.log(`social_attestations=${operatorReport.attestationCount}`);
  console.log(`social_follow_count=${operatorReport.followCount}`);
  console.log(`social_trusted_count=${operatorReport.trustedCount}`);
  console.log(`social_support_count=${operatorReport.supportCount}`);
  console.log(`social_oppose_count=${operatorReport.opposeCount}`);
  console.log(`social_self_asserted_support_count=${operatorReport.selfAssertedSupportCount}`);
  console.log(`social_self_asserted_oppose_count=${operatorReport.selfAssertedOpposeCount}`);
  console.log(`social_next_action=${operatorReport.advice.nextAction}`);
  console.log(`social_next_action_summary=${operatorReport.advice.summary}`);
  if (operatorReport.advice.missingInputs.length > 0) {
    console.log(`social_missing_inputs=${operatorReport.advice.missingInputs.join(",")}`);
  }
}
