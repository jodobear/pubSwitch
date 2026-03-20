import { describe, expect, test } from "bun:test";
import {
  evaluatePathAFixtureScenario,
  getPathAFixtureScenario,
} from "../../../../packages/fixtures/src/index";
import { summarizePathAProofBridge } from "../path-a-proof-bridge";

describe("Path A proof bridge", () => {
  test("reports pending-only proof posture for pending OTS scenarios", async () => {
    const scenario = await getPathAFixtureScenario("pending-ots");
    expect(scenario).toBeDefined();
    const expectedPendingProofIds = scenario!.otsProofs.map((proof) => proof.id!);

    const summary = summarizePathAProofBridge({
      scenario: scenario!,
      resolvedState: evaluatePathAFixtureScenario(scenario!),
    });

    expect(summary).toEqual({
      ok: true,
      helperStatus: "pending_only",
      pendingProofEventIds: expectedPendingProofIds,
      confirmedProofEventIds: [],
      confirmedTargetEventIds: [],
    });
  });

  test("covers the confirmed authority event for confirmed Path A states", async () => {
    const scenario = await getPathAFixtureScenario("confirmed-authority");
    expect(scenario).toBeDefined();
    const expectedAuthorityId =
      scenario?.expectedState.state === "bitcoin_confirmed" ? scenario.expectedState.authorityId : undefined;
    const expectedTargetEventIds = scenario!.otsProofs.map((proof) => proof.tags.find((tag) => tag[0] === "e")![1]);
    const expectedConfirmedProofIds = scenario!.otsProofs.map((proof) => proof.id!);

    const summary = summarizePathAProofBridge({
      scenario: scenario!,
      resolvedState: evaluatePathAFixtureScenario(scenario!),
    });

    expect(summary).toEqual({
      ok: true,
      helperStatus: "confirmed_authority",
      pendingProofEventIds: [],
      confirmedProofEventIds: expectedConfirmedProofIds,
      confirmedTargetEventIds: expectedTargetEventIds,
      authorityId: expectedAuthorityId,
    });
  });

  test("reports plural-authority helper posture for conflicting root states", async () => {
    const scenario = await getPathAFixtureScenario("conflicting-roots");
    expect(scenario).toBeDefined();
    const expectedTargetEventIds = scenario!.otsProofs.map((proof) => proof.tags.find((tag) => tag[0] === "e")![1]);
    const expectedConfirmedProofIds = scenario!.otsProofs.map((proof) => proof.id!);

    const summary = summarizePathAProofBridge({
      scenario: scenario!,
      resolvedState: evaluatePathAFixtureScenario(scenario!),
    });

    expect(summary).toEqual({
      ok: true,
      helperStatus: "conflict_plural_authority",
      pendingProofEventIds: [],
      confirmedProofEventIds: expectedConfirmedProofIds,
      confirmedTargetEventIds: expectedTargetEventIds,
      reason: "helper cannot choose one authority because multiple confirmed roots remain",
    });
  });

  test("reports plural-authority helper posture for conflicting child states", async () => {
    const scenario = await getPathAFixtureScenario("conflicting-children");
    expect(scenario).toBeDefined();
    const expectedTargetEventIds = scenario!.otsProofs.map((proof) => proof.tags.find((tag) => tag[0] === "e")![1]);
    const expectedConfirmedProofIds = scenario!.otsProofs.map((proof) => proof.id!);

    const summary = summarizePathAProofBridge({
      scenario: scenario!,
      resolvedState: evaluatePathAFixtureScenario(scenario!),
    });

    expect(summary).toEqual({
      ok: true,
      helperStatus: "conflict_plural_authority",
      pendingProofEventIds: [],
      confirmedProofEventIds: expectedConfirmedProofIds,
      confirmedTargetEventIds: expectedTargetEventIds,
      reason: "helper cannot choose one authority because multiple confirmed child authorities remain",
    });
  });

  test("uses structured conflict authority metadata for conflicting execution states", async () => {
    const scenario = await getPathAFixtureScenario("conflicting-executions");
    expect(scenario).toBeDefined();
    const expectedAuthorityId =
      scenario?.expectedState.state === "conflict" ? scenario.expectedState.authorityId : undefined;
    const expectedTargetEventIds = scenario!.otsProofs.map((proof) => proof.tags.find((tag) => tag[0] === "e")![1]);
    const expectedConfirmedProofIds = scenario!.otsProofs.map((proof) => proof.id!);

    const summary = summarizePathAProofBridge({
      scenario: scenario!,
      resolvedState: evaluatePathAFixtureScenario(scenario!),
    });

    expect(summary).toEqual({
      ok: true,
      helperStatus: "confirmed_authority",
      pendingProofEventIds: [],
      confirmedProofEventIds: expectedConfirmedProofIds,
      confirmedTargetEventIds: expectedTargetEventIds,
      authorityId: expectedAuthorityId,
    });
  });
});
