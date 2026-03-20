import { describe, expect, test } from "bun:test";
import {
  getPathAConflictPlaybackAutonomousLoop,
  getPathAConflictStateAutonomousLoop,
  getPathARealOtsAdoptionAutonomousLoop,
  getPathARealOtsChainRootAutonomousLoop,
  getPathARealOtsBridgeAutonomousLoop,
  getPathARealOtsCorpusAutonomousLoop,
  getProofEvidenceAutonomousLoop,
  getVerificationCredibilityAutonomousLoop,
} from "../autonomous-loop";

describe("proof evidence autonomous loop", () => {
  test("stays narrow, ordered, and guarded by explicit stop conditions", () => {
    const loop = getProofEvidenceAutonomousLoop();

    expect(loop.id).toBe("path-a-proof-evidence-loop");
    expect(loop.mode).toBe("executor_facing_implementation_loop");
    expect(loop.currentPacketPath).toBe(".private-docs/plans/ots-helper-demo-evidence-packet.md");
    expect(loop.slices.map((slice) => slice.id)).toEqual([
      "helper-posture-panel",
      "proof-inspection-list",
      "proof-provenance-disclosure",
      "demo-script-parity",
    ]);

    for (const slice of loop.slices) {
      expect(slice.confidence).toBe("very_high");
      expect(slice.gates).toContain("bun run typecheck");
      expect(slice.gates).toContain("bun test");
      expect(slice.gates).toContain("manual smoke for UI changes");
      expect(slice.editTargets.length).toBeGreaterThan(0);
      expect(slice.acceptance.length).toBeGreaterThan(0);
      expect(slice.docUpdates.length).toBeGreaterThan(0);
      expect(slice.focusedVerification.length).toBeGreaterThan(0);
      expect(slice.stopIf.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("Path A conflict state autonomous loop", () => {
  test("stays narrow, ordered, and scoped to immediate conflict consumers", () => {
    const loop = getPathAConflictStateAutonomousLoop();

    expect(loop.id).toBe("path-a-conflict-state-loop");
    expect(loop.lane).toBe("path-a-conflict-state");
    expect(loop.currentPacketPath).toBe(".private-docs/plans/path-a-conflict-structure-packet.md");
    expect(loop.slices.map((slice) => slice.id)).toEqual([
      "conflict-structure",
      "conflict-bridge-migration",
      "conflict-demo-migration",
      "conflict-parity",
    ]);

    for (const slice of loop.slices) {
      expect(slice.confidence).toBe("very_high");
      expect(slice.gates).toContain("bun run typecheck");
      expect(slice.gates).toContain("bun test");
      expect(slice.gates).toContain("manual smoke for UI changes");
      expect(slice.editTargets.length).toBeGreaterThan(0);
      expect(slice.acceptance.length).toBeGreaterThan(0);
      expect(slice.docUpdates.length).toBeGreaterThan(0);
      expect(slice.focusedVerification.length).toBeGreaterThan(0);
      expect(slice.stopIf.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("verification credibility autonomous loop", () => {
  test("stays narrow, ordered, and scoped to high-confidence verification slices", () => {
    const loop = getVerificationCredibilityAutonomousLoop();

    expect(loop.id).toBe("verification-credibility-loop");
    expect(loop.lane).toBe("verification-credibility");
    expect(loop.currentPacketPath).toBe(".private-docs/plans/shared-schnorr-foundation-packet.md");
    expect(loop.slices.map((slice) => slice.id)).toEqual([
      "verification-foundation",
      "shared-schnorr-foundation",
      "path-a-schnorr-verification",
      "path-c-schnorr-verification",
    ]);

    for (const slice of loop.slices) {
      expect(slice.confidence).toBe("very_high");
      expect(slice.gates).toContain("bun run typecheck");
      expect(slice.gates).toContain("bun test");
      expect(slice.gates).toContain("manual smoke for UI changes");
      expect(slice.editTargets.length).toBeGreaterThan(0);
      expect(slice.acceptance.length).toBeGreaterThan(0);
      expect(slice.docUpdates.length).toBeGreaterThan(0);
      expect(slice.focusedVerification.length).toBeGreaterThan(0);
      expect(slice.stopIf.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("Path A conflict playback autonomous loop", () => {
  test("stays narrow, ordered, and scoped to immediate conflict playback surfaces", () => {
    const loop = getPathAConflictPlaybackAutonomousLoop();

    expect(loop.id).toBe("path-a-conflict-playback-loop");
    expect(loop.lane).toBe("path-a-conflict-playback");
    expect(loop.currentPacketPath).toBe(".private-docs/plans/path-a-conflict-fixtures-packet.md");
    expect(loop.slices.map((slice) => slice.id)).toEqual([
      "conflict-fixture-corpus",
      "conflict-helper-guardrails",
      "conflict-demo-playback",
      "conflict-script-parity",
    ]);

    for (const slice of loop.slices) {
      expect(slice.confidence).toBe("very_high");
      expect(slice.gates).toContain("bun run typecheck");
      expect(slice.gates).toContain("bun test");
      expect(slice.gates).toContain("manual smoke for UI changes");
      expect(slice.editTargets.length).toBeGreaterThan(0);
      expect(slice.acceptance.length).toBeGreaterThan(0);
      expect(slice.docUpdates.length).toBeGreaterThan(0);
      expect(slice.focusedVerification.length).toBeGreaterThan(0);
      expect(slice.stopIf.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("Path A real OTS corpus autonomous loop", () => {
  test("stays narrow, ordered, and scoped to helper-side real corpus work", () => {
    const loop = getPathARealOtsCorpusAutonomousLoop();

    expect(loop.id).toBe("path-a-real-ots-corpus-loop");
    expect(loop.lane).toBe("path-a-real-ots-corpus");
    expect(loop.currentPacketPath).toBe(".private-docs/plans/path-a-real-ots-corpus-packet.md");
    expect(loop.slices.map((slice) => slice.id)).toEqual([
      "real-pma-corpus",
      "helper-corpus-cli",
      "corpus-script-parity",
      "doc-closeout",
    ]);

    for (const slice of loop.slices) {
      expect(slice.confidence).toBe("very_high");
      expect(slice.gates).toContain("bun run typecheck");
      expect(slice.gates).toContain("bun test");
      expect(slice.gates).toContain("manual smoke for UI changes");
      expect(slice.editTargets.length).toBeGreaterThan(0);
      expect(slice.acceptance.length).toBeGreaterThan(0);
      expect(slice.docUpdates.length).toBeGreaterThan(0);
      expect(slice.focusedVerification.length).toBeGreaterThan(0);
      expect(slice.stopIf.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("Path A real OTS bridge autonomous loop", () => {
  test("stays narrow, ordered, and scoped to browser-safe bridge work", () => {
    const loop = getPathARealOtsBridgeAutonomousLoop();

    expect(loop.id).toBe("path-a-real-ots-bridge-loop");
    expect(loop.lane).toBe("path-a-real-ots-bridge");
    expect(loop.currentPacketPath).toBe(".private-docs/plans/path-a-real-ots-bridge-packet.md");
    expect(loop.slices.map((slice) => slice.id)).toEqual([
      "pure-real-corpus-bridge",
      "demo-real-corpus-snapshot",
      "cli-script-parity",
      "bridge-doc-closeout",
    ]);

    for (const slice of loop.slices) {
      expect(slice.confidence).toBe("very_high");
      expect(slice.gates).toContain("bun run typecheck");
      expect(slice.gates).toContain("bun test");
      expect(slice.gates).toContain("manual smoke for UI changes");
      expect(slice.editTargets.length).toBeGreaterThan(0);
      expect(slice.acceptance.length).toBeGreaterThan(0);
      expect(slice.docUpdates.length).toBeGreaterThan(0);
      expect(slice.focusedVerification.length).toBeGreaterThan(0);
      expect(slice.stopIf.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("Path A real OTS adoption autonomous loop", () => {
  test("stays narrow, ordered, and scoped to main Path A scenario adoption work", () => {
    const loop = getPathARealOtsAdoptionAutonomousLoop();

    expect(loop.id).toBe("path-a-real-ots-adoption-loop");
    expect(loop.lane).toBe("path-a-real-ots-adoption");
    expect(loop.currentPacketPath).toBe(".private-docs/plans/path-a-real-ots-scenario-replacement-packet.md");
    expect(loop.slices.map((slice) => slice.id)).toEqual([
      "pending-real-replacement",
      "real-confirmed-scenario",
      "proof-backing-parity",
      "adoption-doc-closeout",
    ]);

    for (const slice of loop.slices) {
      expect(slice.confidence).toBe("very_high");
      expect(slice.gates).toContain("bun run typecheck");
      expect(slice.gates).toContain("bun test");
      expect(slice.gates).toContain("manual smoke for UI changes");
      expect(slice.editTargets.length).toBeGreaterThan(0);
      expect(slice.acceptance.length).toBeGreaterThan(0);
      expect(slice.docUpdates.length).toBeGreaterThan(0);
      expect(slice.focusedVerification.length).toBeGreaterThan(0);
      expect(slice.stopIf.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("Path A real OTS chain-root autonomous loop", () => {
  test("stays narrow, ordered, and scoped to single-root authority-chain adoption", () => {
    const loop = getPathARealOtsChainRootAutonomousLoop();

    expect(loop.id).toBe("path-a-real-ots-chain-root-loop");
    expect(loop.lane).toBe("path-a-real-ots-chain-root");
    expect(loop.currentPacketPath).toBe(".private-docs/plans/path-a-real-ots-chain-root-packet.md");
    expect(loop.slices.map((slice) => slice.id)).toEqual([
      "confirmed-authority-root-adoption",
      "child-conflict-root-adoption",
      "execution-family-root-adoption",
      "mixed-backing-parity-closeout",
    ]);

    for (const slice of loop.slices) {
      expect(slice.confidence).toBe("very_high");
      expect(slice.gates).toContain("bun run typecheck");
      expect(slice.gates).toContain("bun test");
      expect(slice.gates).toContain("manual smoke for UI changes");
      expect(slice.editTargets.length).toBeGreaterThan(0);
      expect(slice.acceptance.length).toBeGreaterThan(0);
      expect(slice.docUpdates.length).toBeGreaterThan(0);
      expect(slice.focusedVerification.length).toBeGreaterThan(0);
      expect(slice.stopIf.length).toBeGreaterThanOrEqual(4);
    }
  });
});
