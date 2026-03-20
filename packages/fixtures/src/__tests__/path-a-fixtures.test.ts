import { describe, expect, test } from "bun:test";
import { evaluatePathAFixtureScenario, getPathAFixtureScenarios } from "../index";

describe("Path A fixtures", () => {
  test("stay deterministic and match their declared expected states", async () => {
    const scenarios = await getPathAFixtureScenarios();

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "pending-ots",
      "real-confirmed-pma",
      "confirmed-authority",
      "conflicting-roots",
      "conflicting-children",
      "executed-happy-path",
      "conflicting-executions",
    ]);

    expect(
      scenarios.map((scenario) => ({
        id: scenario.id,
        proofBacking: scenario.proofBacking,
      })),
    ).toEqual([
      { id: "pending-ots", proofBacking: "real_helper_verified" },
      { id: "real-confirmed-pma", proofBacking: "real_helper_verified" },
      { id: "confirmed-authority", proofBacking: "real_helper_verified" },
      { id: "conflicting-roots", proofBacking: "real_helper_verified" },
      { id: "conflicting-children", proofBacking: "real_helper_verified" },
      { id: "executed-happy-path", proofBacking: "real_helper_verified" },
      { id: "conflicting-executions", proofBacking: "real_helper_verified" },
    ]);

    for (const scenario of scenarios) {
      expect(evaluatePathAFixtureScenario(scenario)).toEqual(scenario.expectedState);
    }
  });
});
