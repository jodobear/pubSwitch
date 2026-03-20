import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdir } from "node:fs/promises";
import { buildPathALivePlayback, buildPathCLivePlayback } from "../apps/demo-client/src/live-demo";
import { getLiveDemoPackages } from "../apps/demo-client/src/demo-packages";
import { resolveStageScenarioId, STAGE_SCENARIO_PRESETS } from "../apps/demo-client/src/stage-presets";
import {
  RECOVERY_BUNDLE_DEFAULT_ITERATIONS,
  buildRecoveryBundlePayloadFromPathAScenario,
  encryptRecoveryBundle,
  serializeRecoveryBundleEnvelope,
} from "../apps/demo-client/src/recovery-bundle";
import { signNostrEventWithSecretKey } from "../packages/protocol-shared/src/index";
import { getPathAFixtureScenarios, getPathCFixtureScenarios } from "../packages/fixtures/src/index";
import {
  formatDemoCliPlayback,
  formatDemoCliRunPlan,
  formatDemoCliSignupCard,
  formatTerminalShareCard,
} from "./demo-cli-lib";
import {
  DEFAULT_RELAYS,
  formatReceiptSummary,
  openRelaySession,
  publishEvent,
  summarizeObservedState,
} from "./demo-cli-runtime";

const args = process.argv.slice(2);
const [command, ...rest] = args;

const [pathAScenarios, pathCScenarios, livePackages] = await Promise.all([
  getPathAFixtureScenarios(),
  getPathCFixtureScenarios(),
  getLiveDemoPackages(),
]);

if (!command || command === "--help" || command === "--list") {
  printHelp();
  process.exit(0);
}

switch (command) {
  case "share":
    await handleShare(rest);
    break;
  case "publish":
    await handlePublish(rest);
    break;
  case "run":
    await handleRun(rest);
    break;
  case "note":
    await handlePublishNote(rest);
    break;
  case "watch":
    await handleWatch(rest);
    break;
  case "onboard":
    await handleOnboard(rest);
    break;
  default:
    await handleScenarioPlayback(command, rest);
}

async function handleScenarioPlayback(first: string, restArgs: string[]) {
  const scenarioId = resolveStageScenarioId([first, ...restArgs].join(" ").trim());
  const pathAScenario = pathAScenarios.find((entry) => entry.id === scenarioId);
  if (pathAScenario) {
    console.log(formatDemoCliPlayback(buildPathALivePlayback(pathAScenario)));
    return;
  }

  const pathCScenario = pathCScenarios.find((entry) => entry.id === scenarioId);
  if (pathCScenario) {
    console.log(formatDemoCliPlayback(await buildPathCLivePlayback(pathCScenario)));
    return;
  }

  console.error(`Unknown scenario: ${scenarioId}`);
  printHelp();
  process.exit(1);
}

async function handleShare(restArgs: string[]) {
  const [scenarioId, selector] = restArgs;
  if (!scenarioId) {
    console.error("Usage: bun run demo:cli share <scenario-id> [old|new|actor-index]");
    process.exit(1);
  }

  const demoPackage = requireDemoPackage(resolveStageScenarioId(scenarioId));
  const actor = pickActor(demoPackage.noteActors, selector);
  console.log(
    await formatTerminalShareCard({
      label: `${demoPackage.title} · ${actor.label}`,
      pubkeyHex: actor.pubkey,
    }),
  );
}

async function handlePublish(restArgs: string[]) {
  const [scenarioId] = restArgs;
  if (!scenarioId) {
    console.error("Usage: bun run demo:cli publish <scenario-id>");
    process.exit(1);
  }

  const demoPackage = requireDemoPackage(resolveStageScenarioId(scenarioId));
  const session = await openRelaySession({
    relays: DEFAULT_RELAYS,
    demoPackage,
    since: 0,
  });

  try {
    console.log(`# Publishing ${demoPackage.title}`);
    for (const action of demoPackage.preparedActions) {
      const receipts = await publishEvent(session, action.event);
      console.log(`- ${action.title}`);
      console.log(`  ${formatReceiptSummary(receipts)}`);
    }

    const state = session.observedEvents.length > 0 ? await summarizeObservedState(demoPackage, session.observedEvents) : undefined;
    console.log("");
    console.log(`expected_state=${describeExpectedState(demoPackage)}`);
    console.log(`observed_state=${state ?? "(no relay echo observed yet)"}`);
  } finally {
    session.close();
  }
}

async function handleRun(restArgs: string[]) {
  const scenarioId = restArgs.find((entry) => !entry.startsWith("--"));
  if (!scenarioId) {
    console.error(
      "Usage: bun run demo:cli run <scenario-id> [--actor old|new|index] [--note \"...\"] [--no-note] [--watch-seconds N]",
    );
    process.exit(1);
  }

  const actorSelector = readFlag(restArgs, "--actor");
  const noteFlag = readFlag(restArgs, "--note");
  const liveNoteEnabled = !restArgs.includes("--no-note");
  const dryRun = restArgs.includes("--dry-run");
  const watchSecondsFlag = readFlag(restArgs, "--watch-seconds");
  const parsedWatchSeconds = watchSecondsFlag === undefined ? 8 : Number(watchSecondsFlag);
  const watchSeconds =
    Number.isFinite(parsedWatchSeconds) && parsedWatchSeconds >= 0 ? parsedWatchSeconds : 8;
  const noteContent = noteFlag?.trim() || "gm from tack cli";
  const demoPackage = requireDemoPackage(resolveStageScenarioId(scenarioId));
  const actor = pickActor(demoPackage.noteActors, actorSelector);

  console.log(
    formatDemoCliRunPlan({
      scenarioId: demoPackage.id,
      title: demoPackage.title,
      lane: demoPackage.lane,
      actorLabel: actor.label,
      relayCount: DEFAULT_RELAYS.length,
      liveNote: liveNoteEnabled,
      watchSeconds,
      actions: demoPackage.preparedActions.map((action) => ({
        title: action.title,
        subtitle: action.detail,
      })),
    }),
  );
  console.log("");
  console.log(
    await formatTerminalShareCard({
      label: `${demoPackage.title} · ${actor.label}`,
      pubkeyHex: actor.pubkey,
    }),
  );

  if (dryRun) {
    console.log("");
    console.log("# dry run");
    console.log(formatDemoCliPlayback(demoPackage.lane === "path-a" ? buildPathALivePlayback(demoPackage.scenario) : await buildPathCLivePlayback(demoPackage.scenario)));
    return;
  }

  console.log("");

  const session = await openRelaySession({
    relays: DEFAULT_RELAYS,
    demoPackage,
    since: 0,
    onEvent: async (event, stateText) => {
      console.log(`[event] kind=${event.kind} id=${shortHex(event.id)} pubkey=${shortHex(event.pubkey)}`);
      if (stateText) {
        console.log(`[state] ${stateText}`);
      }
    },
    onNotice: async (message, relayUrl) => {
      console.log(`[notice] ${relayUrl} ${message}`);
    },
    onReceipt: async (receipt) => {
      const status = receipt.accepted
        ? "accepted"
        : `${receipt.message}`.toLowerCase().includes("duplicate")
          ? "duplicate"
          : "rejected";
      console.log(`[receipt] ${receipt.relayUrl} ${status} ${shortHex(receipt.eventId)}`);
    },
  });

  try {
    if (liveNoteEnabled) {
      const noteEvent = signNostrEventWithSecretKey(
        {
          pubkey: actor.pubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 1,
          tags: [],
          content: noteContent,
        },
        actor.secretKey,
      );
      const receipts = await publishEvent(session, noteEvent);
      console.log("");
      console.log(`# live note`);
      console.log(`content=${JSON.stringify(noteContent)}`);
      console.log(formatReceiptSummary(receipts));
    }

    console.log("");
    console.log(`# prepared scenario events`);
    for (const action of demoPackage.preparedActions) {
      const receipts = await publishEvent(session, action.event);
      console.log(`- ${action.title}`);
      console.log(`  ${formatReceiptSummary(receipts)}`);
    }

    if (watchSeconds > 0) {
      console.log("");
      console.log(`# watching for ${watchSeconds}s`);
      await Bun.sleep(watchSeconds * 1000);
    }

    const state = session.observedEvents.length > 0 ? await summarizeObservedState(demoPackage, session.observedEvents) : undefined;
    console.log("");
    console.log(`expected_state=${describeExpectedState(demoPackage)}`);
    console.log(`observed_state=${state ?? "(no relay echo observed yet)"}`);
  } finally {
    session.close();
  }
}

async function handlePublishNote(restArgs: string[]) {
  const [scenarioId, selector, ...contentParts] = restArgs;
  if (!scenarioId) {
    console.error("Usage: bun run demo:cli note <scenario-id> [old|new|actor-index] [content...]");
    process.exit(1);
  }

  const content = contentParts.join(" ").trim() || "gm from tack cli";
  const demoPackage = requireDemoPackage(resolveStageScenarioId(scenarioId));
  const actor = pickActor(demoPackage.noteActors, selector);
  const event = signNostrEventWithSecretKey(
    {
      pubkey: actor.pubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content,
    },
    actor.secretKey,
  );

  const session = await openRelaySession({
    relays: DEFAULT_RELAYS,
    demoPackage,
    since: 0,
  });

  try {
    const receipts = await publishEvent(session, event);
    console.log(`# Published kind 1 note as ${actor.label}`);
    console.log(`id=${event.id}`);
    console.log(formatReceiptSummary(receipts));
  } finally {
    session.close();
  }
}

async function handleWatch(restArgs: string[]) {
  const [scenarioId] = restArgs;
  if (!scenarioId) {
    console.error("Usage: bun run demo:cli watch <scenario-id>");
    process.exit(1);
  }

  const demoPackage = requireDemoPackage(resolveStageScenarioId(scenarioId));
  let lastState = "";
  const session = await openRelaySession({
    relays: DEFAULT_RELAYS,
    demoPackage,
    since: 0,
    onEvent: async (event, stateText) => {
      console.log(`[event] kind=${event.kind} id=${shortHex(event.id)} pubkey=${shortHex(event.pubkey)}`);
      if (stateText && stateText !== lastState) {
        lastState = stateText;
        console.log(`[state] ${stateText}`);
      }
    },
    onNotice: async (message, relayUrl) => {
      console.log(`[notice] ${relayUrl} ${message}`);
    },
    onReceipt: async (receipt) => {
      const status = receipt.accepted
        ? "accepted"
        : `${receipt.message}`.toLowerCase().includes("duplicate")
          ? "duplicate"
          : "rejected";
      console.log(`[receipt] ${receipt.relayUrl} ${status} ${shortHex(receipt.eventId)}`);
    },
  });

  console.log(`# Watching ${demoPackage.title}`);
  console.log(`# Relays: ${session.relays.join(", ")}`);
  console.log("# Ctrl+C to stop");

  await new Promise<void>((resolve) => {
    const onSigint = () => {
      process.off("SIGINT", onSigint);
      session.close();
      resolve();
    };
    process.on("SIGINT", onSigint);
  });
}

async function handleOnboard(restArgs: string[]) {
  const bundleArg = readFlag(restArgs, "--bundle");
  const handleArg = readFlag(restArgs, "--handle");
  const passphraseArg = readFlag(restArgs, "--passphrase");
  const confirmPassphraseArg = readFlag(restArgs, "--confirm-passphrase");
  const publishNowArg = readFlag(restArgs, "--publish-now");
  const bundlePath = bundleArg ?? "output/cli-onboarding-bundle.json";
  const onboardingPackage = requireDemoPackage("pending-ots");
  if (onboardingPackage.lane !== "path-a") {
    throw new Error("pending-ots must be a Path A package");
  }

  let handle = (handleArg?.trim() || "").replace(/\s+/g, "-");
  let passphrase = passphraseArg?.trim() ?? "";
  let confirmPassphrase = confirmPassphraseArg?.trim() ?? "";
  let publishAnswer = publishNowArg?.trim().toLowerCase() ?? "";

  if (!handle || !passphrase || !confirmPassphrase || !publishAnswer) {
    const rl = createInterface({ input, output });
    handle = (handle || (await rl.question("Handle (default tack): ")).trim() || "tack").replace(/\s+/g, "-");
    passphrase = passphrase || (await rl.question("Backup passphrase: ")).trim();
    confirmPassphrase = confirmPassphrase || (await rl.question("Confirm passphrase: ")).trim();
    console.log("");
    console.log(
      formatDemoCliSignupCard({
        title: "tack signup",
        handle,
        bundlePath,
        relayCount: DEFAULT_RELAYS.length,
      }),
    );
    console.log("");
    publishAnswer = (publishAnswer || (await rl.question("Publish 1776 + 1040 now? [Y/n]: ")).trim() || "y").toLowerCase();
    rl.close();
  } else {
    handle = handle || "tack";
    console.log(
      formatDemoCliSignupCard({
        title: "tack signup",
        handle,
        bundlePath,
        relayCount: DEFAULT_RELAYS.length,
      }),
    );
  }

  if (passphrase !== confirmPassphrase) {
    console.error("Passphrases do not match");
    process.exit(1);
  }

  if (!passphrase) {
    console.error("Passphrase must not be empty");
    process.exit(1);
  }

  const bundle = buildRecoveryBundlePayloadFromPathAScenario({
    scenario: onboardingPackage.scenario,
  });
  const envelope = await encryptRecoveryBundle({
    bundle,
    passphrase,
    iterations: RECOVERY_BUNDLE_DEFAULT_ITERATIONS,
  });

  await mkdir(bundlePath.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  await Bun.write(bundlePath, serializeRecoveryBundleEnvelope(envelope));

  console.log(`# Signup complete`);
  console.log(`handle=${handle}`);
  console.log(`bundle=${bundlePath}`);
  console.log("");
  console.log(
    await formatTerminalShareCard({
      label: `${handle} · onboarding follow target`,
      pubkeyHex: onboardingPackage.noteActors[0]!.pubkey,
    }),
  );

  if (publishAnswer === "n" || publishAnswer === "no") {
    console.log("");
    console.log("# Signup package ready");
    console.log("next=publish 1776 then 1040 when you are ready");
    return;
  }

  console.log("");
  console.log("# Publishing required onboarding events");

  const session = await openRelaySession({
    relays: DEFAULT_RELAYS,
    demoPackage: onboardingPackage,
    since: 0,
  });

  try {
    for (const action of onboardingPackage.preparedActions) {
      const receipts = await publishEvent(session, action.event);
      console.log(`- ${action.title}`);
      console.log(`  ${formatReceiptSummary(receipts)}`);
    }

    const state =
      session.observedEvents.length > 0
        ? await summarizeObservedState(onboardingPackage, session.observedEvents)
        : undefined;
    console.log("");
    console.log(`expected_state=${describeExpectedState(onboardingPackage)}`);
    console.log(`observed_state=${state ?? "(no relay echo observed yet)"}`);
  } finally {
    session.close();
  }
}

function requireDemoPackage(id: string) {
  const demoPackage = livePackages.find((entry) => entry.id === id);
  if (!demoPackage) {
    throw new Error(`Unknown scenario: ${id}`);
  }
  return demoPackage;
}

function pickActor(
  actors: Array<{ pubkey: string; label: string; secretKey: string }>,
  selector: string | undefined,
) {
  if (actors.length === 0) {
    throw new Error("No actor available");
  }

  if (!selector || selector === "old") {
    return actors[0]!;
  }

  if (selector === "new") {
    return actors[Math.min(1, actors.length - 1)]!;
  }

  const index = Number(selector);
  if (Number.isSafeInteger(index) && index >= 0 && index < actors.length) {
    return actors[index]!;
  }

  return actors[0]!;
}

function readFlag(argsList: string[], flag: string): string | undefined {
  const index = argsList.findIndex((entry) => entry === flag);
  return index >= 0 ? argsList[index + 1] : undefined;
}

function shortHex(value: string | undefined): string {
  if (!value) {
    return "(none)";
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function describeExpectedState(demoPackage: (typeof livePackages)[number]): string {
  return demoPackage.lane === "path-a"
    ? demoPackage.scenario.expectedState.state
    : demoPackage.scenario.expectedState.state;
}

function printHelp() {
  console.log("Usage:");
  console.log("  bun run demo:cli --list");
  console.log("  bun run demo:cli <scenario-id>");
  console.log("  bun run demo:cli share <scenario-id> [old|new|actor-index]");
  console.log("  bun run demo:cli publish <scenario-id>");
  console.log(
    "  bun run demo:cli run <scenario-id> [--actor old|new|actor-index] [--note \"...\"] [--no-note] [--watch-seconds N] [--dry-run]",
  );
  console.log("  bun run demo:cli note <scenario-id> [old|new|actor-index] [content...]");
  console.log("  bun run demo:cli watch <scenario-id>");
  console.log(
    "  bun run demo:cli onboard [--bundle output/cli-onboarding-bundle.json] [--handle alice] [--passphrase secret] [--confirm-passphrase secret] [--publish-now yes|no]",
  );
  console.log("");
  console.log("Stage presets:");
  STAGE_SCENARIO_PRESETS.forEach((entry) => console.log(`- ${entry.id} -> ${entry.packageId}`));
  console.log("");
  console.log("Path A:");
  pathAScenarios.forEach((entry) => console.log(`- ${entry.id}`));
  console.log("");
  console.log("Path C:");
  pathCScenarios.forEach((entry) => console.log(`- ${entry.id}`));
}
