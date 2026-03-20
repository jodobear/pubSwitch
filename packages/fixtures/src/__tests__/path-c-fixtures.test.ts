import { describe, expect, test } from "bun:test";
import { evaluatePathCFixtureScenario, getPathCFixtureScenarios } from "../index";

describe("Path C fixtures", () => {
  test("stay deterministic and match their declared expected states", async () => {
    const scenarios = await getPathCFixtureScenarios();

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "claim-only",
      "socially-supported",
      "socially-split",
      "self-asserted-noise",
    ]);

    for (const scenario of scenarios) {
      expect(await evaluatePathCFixtureScenario(scenario)).toEqual(scenario.expectedState);
    }
  });
});
