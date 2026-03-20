import { describe, expect, test } from "bun:test";
import {
  buildDemoWalkthroughPlan,
  getPathAFixtureScenarios,
  getPathCFixtureScenarios,
} from "../index";

describe("demo walkthrough plan", () => {
  test("stays deterministic and reflects current Path A backing coverage honestly", async () => {
    const plan = buildDemoWalkthroughPlan({
      pathAScenarios: await getPathAFixtureScenarios(),
      pathCScenarios: await getPathCFixtureScenarios(),
    });

    expect(plan.pathAProofBackingCounts).toEqual({
      real_helper_verified: 7,
      mixed_real_root: 0,
      fixture_placeholder: 0,
    });

    expect(plan.sections.map((section) => section.id)).toEqual([
      "path-a-real-basics",
      "path-a-real-chain",
      "path-c-advisory",
      "recovery-demo",
    ]);

    expect(plan.sections[0]?.items.map((item) => item.id)).toEqual([
      "pending-ots",
      "real-confirmed-pma",
      "conflicting-roots",
    ]);

    expect(plan.sections[1]?.items.map((item) => item.id)).toEqual([
      "confirmed-authority",
      "conflicting-children",
      "executed-happy-path",
      "conflicting-executions",
    ]);

    expect(plan.caveats).toContain(
      "Path A fixture resolution still uses local `x-verified-anchor-height` metadata because the pure resolver consumes browser-safe proof tags, while raw `.ots` parsing still lives in the helper layer.",
    );
  });
});
