import { describe, expect, test } from "bun:test";
import { evaluatePathAV3FixtureScenario, getPathAV3FixtureScenarios } from "../index";

describe("Path A v3 fixtures", () => {
  test("stay deterministic and match their declared expected v3 states", async () => {
    const scenarios = await getPathAV3FixtureScenarios();

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "v3-pending-ots",
      "v3-prepared-enrolled",
      "v3-prepared-migrated",
      "v3-conflicting-roots",
      "v3-conflicting-authority-updates",
      "v3-conflicting-executions",
    ]);

    for (const scenario of scenarios) {
      expect(evaluatePathAV3FixtureScenario(scenario)).toEqual(scenario.expectedState);
    }
  });
});
