import {
  getPathAConflictPlaybackAutonomousLoop,
  getPathAConflictStateAutonomousLoop,
  getPathARealOtsAdoptionAutonomousLoop,
  getPathARealOtsChainRootAutonomousLoop,
  getPathARealOtsBridgeAutonomousLoop,
  getPathARealOtsCorpusAutonomousLoop,
  getProofEvidenceAutonomousLoop,
  getVerificationCredibilityAutonomousLoop,
} from "../packages/fixtures/src/autonomous-loop";

if (Bun.argv.includes("--current")) {
  console.log("No active autonomous implementation loop is currently queued.");
  console.log("Current active packet: .private-docs/plans/follow-on-options-packet.md");
  process.exit(0);
}

const loopId =
  Bun.argv.find((arg) => arg.startsWith("--loop="))?.slice("--loop=".length) ??
  "path-a-real-ots-chain-root-loop";

const loop =
  loopId === "path-a-real-ots-chain-root-loop"
    ? getPathARealOtsChainRootAutonomousLoop()
    : loopId === "path-a-real-ots-adoption-loop"
    ? getPathARealOtsAdoptionAutonomousLoop()
    : loopId === "path-a-real-ots-bridge-loop"
    ? getPathARealOtsBridgeAutonomousLoop()
    : loopId === "path-a-real-ots-corpus-loop"
    ? getPathARealOtsCorpusAutonomousLoop()
    : loopId === "path-a-conflict-playback-loop"
    ? getPathAConflictPlaybackAutonomousLoop()
    : loopId === "verification-credibility-loop"
    ? getVerificationCredibilityAutonomousLoop()
    : loopId === "path-a-conflict-state-loop"
    ? getPathAConflictStateAutonomousLoop()
    : getProofEvidenceAutonomousLoop();
const asJson = Bun.argv.includes("--json");
const asPrompt = Bun.argv.includes("--prompt");

if (asJson) {
  console.log(JSON.stringify(loop, null, 2));
} else if (asPrompt) {
  console.log("Execute this implementation loop end to end unless a hard stop condition triggers.");
  console.log("");
  console.log(`Lane: ${loop.lane}`);
  console.log(`Confidence: ${loop.confidence}`);
  console.log(`Mode: ${loop.mode}`);
  console.log("");
  console.log("Executor contract:");
  console.log(loop.executorContract);
  console.log("");
  console.log("Global stop conditions:");

  for (const condition of loop.stopConditions) {
    console.log(`- ${condition}`);
  }

  console.log("");
  console.log("Slice queue:");

  for (const [index, slice] of loop.slices.entries()) {
    console.log(`${index + 1}. ${slice.title}`);
    console.log(`Packet: ${slice.packetPath}`);
    console.log(`Focus: ${slice.focus}`);
    console.log("Edit targets:");

    for (const target of slice.editTargets) {
      console.log(`- ${target}`);
    }

    console.log("Acceptance:");

    for (const requirement of slice.acceptance) {
      console.log(`- ${requirement}`);
    }

    console.log("Focused verification:");

    for (const check of slice.focusedVerification) {
      console.log(`- ${check}`);
    }

    console.log("Doc updates:");

    for (const doc of slice.docUpdates) {
      console.log(`- ${doc}`);
    }

    console.log("");
  }
} else {
  console.log(`# ${loop.title}`);
  console.log("");
  console.log(`confidence: ${loop.confidence}`);
  console.log(`lane: ${loop.lane}`);
  console.log(`mode: ${loop.mode}`);
  console.log(`current packet: ${loop.currentPacketPath}`);
  console.log(`loop doc: ${loop.loopDocPath}`);
  console.log("");
  console.log("executor contract:");
  console.log(loop.executorContract);
  console.log("");
  console.log("global stop conditions:");

  for (const condition of loop.stopConditions) {
    console.log(`- ${condition}`);
  }

  console.log("");
  console.log("slices:");

  for (const [index, slice] of loop.slices.entries()) {
    console.log(`${index + 1}. ${slice.title}`);
    console.log(`   packet: ${slice.packetPath}`);
    console.log(`   focus: ${slice.focus}`);
    console.log(`   edits: ${slice.editTargets.join(", ")}`);
  }
}
