import { describe, expect, test } from "bun:test";
import { encodeNpub, formatDemoCliPlayback, formatDemoCliRunPlan, formatDemoCliSignupCard } from "./demo-cli-lib";
import { buildPathALivePlayback } from "../apps/demo-client/src/live-demo";
import { getPathAFixtureScenarios } from "../packages/fixtures/src/index";

describe("demo cli formatting", () => {
  test("formats a path-a playback into a readable terminal script", async () => {
    const scenarios = await getPathAFixtureScenarios();
    const pending = scenarios.find((entry) => entry.id === "pending-ots");
    if (!pending) {
      throw new Error("missing pending-ots scenario");
    }

    const output = formatDemoCliPlayback(buildPathALivePlayback(pending));

    expect(output).toContain("# tack CLI demo: pending-ots");
    expect(output).toContain("Actions:");
    expect(output).toContain("Publish PMA");
    expect(output).toContain("State progression:");
    expect(output).toContain("Pending authority, not valid yet");
  });

  test("encodes an actor pubkey as npub", async () => {
    const scenarios = await getPathAFixtureScenarios();
    const pending = scenarios.find((entry) => entry.id === "pending-ots");
    if (!pending) {
      throw new Error("missing pending-ots scenario");
    }

    const npub = encodeNpub(pending.oldPubkey);

    expect(npub.startsWith("npub1")).toBe(true);
    expect(npub.length).toBeGreaterThan(10);
  });

  test("formats a live run plan for stage use", () => {
    const output = formatDemoCliRunPlan({
      scenarioId: "confirmed-authority",
      title: "Confirmed Authority",
      lane: "path-a",
      actorLabel: "Old key",
      relayCount: 3,
      liveNote: true,
      watchSeconds: 8,
      actions: [
        {
          title: "Publish 1776 PMA",
          subtitle: "Root authority is announced.",
        },
        {
          title: "Publish 1040 proof",
          subtitle: "Bitcoin anchoring proof is published.",
        },
      ],
    });

    expect(output).toContain("# tack live run: confirmed-authority");
    expect(output).toContain("Confirmed Authority · PATH-A · actor Old key");
    expect(output).toContain("live note: yes");
    expect(output).toContain("watch window: 8s");
    expect(output).toContain("publish live kind 1 note");
    expect(output).toContain("Publish 1776 PMA");
  });

  test("formats a signup-style onboarding card", () => {
    const output = formatDemoCliSignupCard({
      title: "tack signup",
      handle: "alice",
      bundlePath: "output/demo-bundle.json",
      relayCount: 3,
    });

    expect(output).toContain("# tack signup");
    expect(output).toContain("handle: alice");
    expect(output).toContain("bundle: output/demo-bundle.json");
    expect(output).toContain("publish 1776");
    expect(output).toContain("publish 1040");
  });
});
