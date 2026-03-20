import { describe, expect, test } from "bun:test";
import { resolveStageScenarioId, STAGE_SCENARIO_PRESETS } from "../stage-presets";

describe("stage presets", () => {
  test("resolves happy and contested aliases to real package ids", () => {
    expect(resolveStageScenarioId("happy")).toBe("executed-happy-path");
    expect(resolveStageScenarioId("contested")).toBe("conflicting-executions");
    expect(resolveStageScenarioId("confirmed-authority")).toBe("confirmed-authority");
  });

  test("keeps the curated preset list deterministic", () => {
    expect(STAGE_SCENARIO_PRESETS.map((entry) => entry.id)).toEqual(["happy", "contested"]);
  });
});
