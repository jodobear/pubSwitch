import { describe, expect, test } from "bun:test";
import { getPathAFixtureScenario, getPathCFixtureScenario } from "../../../../packages/fixtures/src/index";
import { buildPathALivePlayback, buildPathCLivePlayback } from "../live-demo";

describe("live demo playback", () => {
  test("builds a stepwise Path A playback for pending OTS", async () => {
    const scenario = await getPathAFixtureScenario("pending-ots");
    if (!scenario) {
      throw new Error("missing pending-ots scenario");
    }

    const playback = buildPathALivePlayback(scenario);

    expect(playback.actions.map((action) => action.title)).toEqual([
      "Publish PMA",
      "Attach pending 1040 proof",
    ]);
    expect(playback.steps.map((step) => step.resolvedState.state)).toEqual([
      "none",
      "none",
      "published_pending_ots",
    ]);
    expect(playback.steps[1]?.title).toBe("Signed rotation intent is visible");
    expect(playback.steps[2]?.title).toBe("Pending authority, not valid yet");
  });

  test("builds a real root-conflict Path A playback with plural ending state", async () => {
    const scenario = await getPathAFixtureScenario("conflicting-roots");
    if (!scenario) {
      throw new Error("missing conflicting-roots scenario");
    }

    const playback = buildPathALivePlayback(scenario);
    const finalStep = playback.steps.at(-1);

    expect(playback.actions).toHaveLength(4);
    expect(finalStep?.resolvedState).toMatchObject({
      state: "conflict",
      conflictKind: "multiple_roots",
    });
    expect(finalStep?.title).toBe("Plural root conflict");
  });

  test("builds a stepwise Path C playback from claims to followed support", async () => {
    const scenario = await getPathCFixtureScenario("socially-supported");
    if (!scenario) {
      throw new Error("missing socially-supported scenario");
    }

    const playback = await buildPathCLivePlayback(scenario);

    expect(playback.actions.map((action) => action.title)).toEqual([
      "Old key posts a claim",
      "Followed attestor posts support STA",
      "Followed attestor posts support STA",
    ]);
    expect(playback.steps.map((step) => step.resolvedState.state)).toEqual([
      "none",
      "claimed",
      "socially_supported",
      "socially_supported",
    ]);
    expect(playback.steps[2]?.title).toBe("Locally supported social continuity");
  });
});
