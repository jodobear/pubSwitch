import { describe, expect, test } from "bun:test";
import {
  evaluatePathAFixtureScenario,
  getPathAFixtureScenario,
} from "../../../../packages/fixtures/src/index";
import { buildPathAProofViewModel } from "../path-a-proof-view";

describe("Path A proof view model", () => {
  test("models pending helper posture from deterministic fixtures", async () => {
    const scenario = await getPathAFixtureScenario("pending-ots");

    if (!scenario) {
      throw new Error("missing pending-ots scenario");
    }

    const view = buildPathAProofViewModel({
      scenario,
      resolvedState: evaluatePathAFixtureScenario(scenario),
    });

    expect(view.summary.statusCode).toBe("pending_only");
    expect(view.summary.tone).toBe("warn");
    expect(view.inspections).toEqual([
      expect.objectContaining({
        kind: "valid",
        statusCode: "pending",
      }),
    ]);
    expect(view.provenance.find((card) => card.source === "helper")?.items).toContain(
      "helper_status pending_only",
    );
  });

  test("models confirmed authority coverage from deterministic fixtures", async () => {
    const scenario = await getPathAFixtureScenario("confirmed-authority");

    if (!scenario) {
      throw new Error("missing confirmed-authority scenario");
    }

    const view = buildPathAProofViewModel({
      scenario,
      resolvedState: evaluatePathAFixtureScenario(scenario),
    });

    expect(view.summary.statusCode).toBe("confirmed_authority");
    expect(view.summary.tone).toBe("ok");
    expect(view.inspections.filter((entry) => entry.kind === "valid")).toHaveLength(4);
    expect(view.provenance.find((card) => card.source === "protocol")?.items[0]).toBe(
      "resolved_state bitcoin_confirmed",
    );
  });

  test("models plural root conflicts without claiming one active authority", async () => {
    const scenario = await getPathAFixtureScenario("conflicting-roots");

    if (!scenario) {
      throw new Error("missing conflicting-roots scenario");
    }

    const view = buildPathAProofViewModel({
      scenario,
      resolvedState: evaluatePathAFixtureScenario(scenario),
    });

    expect(view.summary.statusCode).toBe("conflict_plural_authority");
    expect(view.summary.tone).toBe("warn");
    expect(view.summary.title).toBe("Plural authority conflict");
    expect(view.summary.detail).toContain("multiple confirmed roots remain");
    expect(view.provenance.find((card) => card.source === "helper")?.items).toContain(
      "helper_authority_coverage unavailable while the protocol state is plural",
    );
    expect(view.provenance.find((card) => card.source === "protocol")?.items).toEqual(
      expect.arrayContaining([
        "resolved_state conflict",
        "conflict_kind multiple_roots",
        "authority_id unavailable in this resolved state",
        "conflict_root_count 2",
      ]),
    );
  });

  test("models plural child conflicts without helper authority coverage", async () => {
    const scenario = await getPathAFixtureScenario("conflicting-children");

    if (!scenario) {
      throw new Error("missing conflicting-children scenario");
    }

    const view = buildPathAProofViewModel({
      scenario,
      resolvedState: evaluatePathAFixtureScenario(scenario),
    });
    const expectedAuthorityId =
      scenario.expectedState.state === "conflict" ? scenario.expectedState.authorityId : undefined;

    expect(view.summary.statusCode).toBe("conflict_plural_authority");
    expect(view.summary.tone).toBe("warn");
    expect(view.summary.title).toBe("Plural authority conflict");
    expect(view.summary.detail).toContain("multiple confirmed child authorities remain");
    expect(view.provenance.find((card) => card.source === "helper")?.items).toContain(
      "helper_authority_coverage unavailable while the protocol state is plural",
    );
    expect(view.provenance.find((card) => card.source === "protocol")?.items).toEqual(
      expect.arrayContaining([
        "resolved_state conflict",
        "conflict_kind multiple_children",
        `authority_id ${expectedAuthorityId}`,
        "conflicting_child_count 2",
      ]),
    );
  });

  test("surfaces invalid helper output without mutating protocol state", async () => {
    const scenario = await getPathAFixtureScenario("pending-ots");

    if (!scenario) {
      throw new Error("missing pending-ots scenario");
    }

    const brokenScenario = {
      ...scenario,
      otsProofs: scenario.otsProofs.map((proof, index) =>
        index === 0 ? { ...proof, content: "" } : proof,
      ),
    };

    const view = buildPathAProofViewModel({
      scenario: brokenScenario,
      resolvedState: evaluatePathAFixtureScenario(scenario),
    });

    expect(view.summary.statusCode).toBe("invalid_helper_output");
    expect(view.inspections[0]).toEqual(
      expect.objectContaining({
        kind: "invalid",
        statusCode: "invalid",
      }),
    );
  });

  test("uses structured conflict metadata in provenance for conflict scenarios", async () => {
    const scenario = await getPathAFixtureScenario("conflicting-executions");

    if (!scenario) {
      throw new Error("missing conflicting-executions scenario");
    }

    const view = buildPathAProofViewModel({
      scenario,
      resolvedState: evaluatePathAFixtureScenario(scenario),
    });
    const expectedAuthorityId =
      scenario.expectedState.state === "conflict" ? scenario.expectedState.authorityId : undefined;

    expect(view.provenance.find((card) => card.source === "protocol")?.items).toEqual(
      expect.arrayContaining([
        "resolved_state conflict",
        "conflict_kind multiple_executions",
        `authority_id ${expectedAuthorityId}`,
        "conflicting_execution_count 2",
      ]),
    );
  });
});
