import { describe, expect, test } from "bun:test";
import { getOtsDemoVector } from "../demo-vectors";
import { getPathAFixtureScenario } from "../../../../packages/fixtures/src/index";
import { inspectOtsProofEvent, inspectPathAScenarioProofs } from "../inspect";
import { inspectOtsProofEventWithRealVerification } from "../real-inspect";

describe("OTS helper inspect", () => {
  test("verifies bundled real OTS vectors locally from proof bytes", () => {
    const completeVector = getOtsDemoVector("sample-bitcoin-confirmed");
    const pendingVector = getOtsDemoVector("sample-pending");

    expect(completeVector).toBeDefined();
    expect(pendingVector).toBeDefined();

    expect(inspectOtsProofEventWithRealVerification(completeVector!.proofEvent)).toEqual({
      ok: true,
      proofEventId: "abababababababababababababababababababababababababababababababab",
      targetEventId: completeVector!.targetEventId,
      targetKind: 1776,
      contentLength: completeVector!.proofEvent.content.length,
      status: "bitcoin_confirmed",
      anchorHeight: 358_391,
    });

    expect(inspectOtsProofEventWithRealVerification(pendingVector!.proofEvent)).toEqual({
      ok: true,
      proofEventId: "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
      targetEventId: pendingVector!.targetEventId,
      targetKind: 1776,
      contentLength: pendingVector!.proofEvent.content.length,
      status: "pending",
    });
  });

  test("reports pending and confirmed fixture proofs from real Path A scenarios", async () => {
    const pendingScenario = await getPathAFixtureScenario("pending-ots");
    const confirmedScenario = await getPathAFixtureScenario("confirmed-authority");

    expect(pendingScenario).toBeDefined();
    expect(confirmedScenario).toBeDefined();

    const pendingInspection = inspectOtsProofEvent(pendingScenario!.otsProofs[0]!);
    const confirmedInspection = inspectOtsProofEvent(confirmedScenario!.otsProofs[0]!);

    expect(pendingInspection).toEqual({
      ok: true,
      proofEventId: pendingScenario!.otsProofs[0]!.id!,
      targetEventId: pendingScenario!.events[0]!.id!,
      targetKind: 1776,
      contentLength: pendingScenario!.otsProofs[0]!.content.length,
      status: "pending",
    });

    expect(confirmedInspection).toEqual({
      ok: true,
      proofEventId: confirmedScenario!.otsProofs[0]!.id!,
      targetEventId: confirmedScenario!.events[0]!.id!,
      targetKind: 1776,
      contentLength: confirmedScenario!.otsProofs[0]!.content.length,
      status: "bitcoin_confirmed",
      anchorHeight: Number(
        confirmedScenario!.otsProofs[0]!.tags.find((tag) => tag[0] === "x-verified-anchor-height")![1],
      ),
    });
  });

  test("inspects a whole Path A scenario proof set", async () => {
    const inspection = await inspectPathAScenarioProofs("confirmed-authority");

    expect(inspection.ok).not.toBe(false);
    if ("ok" in inspection && inspection.ok === false) {
      throw new Error(inspection.reason);
    }

    expect(inspection.scenarioId).toBe("confirmed-authority");
    expect(inspection.inspections).toHaveLength(4);
    expect(inspection.inspections.every((entry) => entry.ok)).toBe(true);
  });

  test("rejects malformed 1040 events", () => {
    const result = inspectOtsProofEventWithRealVerification({
      id: "f".repeat(64),
      pubkey: "a".repeat(64),
      created_at: 1,
      kind: 1040,
      tags: [["k", "1776"]],
      content: "",
      sig: "9".repeat(128),
    });

    expect(result).toEqual({
      ok: false,
      code: "empty_content",
      reason: "OTS proof event content must contain proof bytes",
      proofEventId: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    });
  });

  test("rejects real OTS payloads whose digest does not match the e tag", () => {
    const vector = getOtsDemoVector("sample-bitcoin-confirmed");
    expect(vector).toBeDefined();

    const result = inspectOtsProofEventWithRealVerification({
      ...vector!.proofEvent,
      tags: vector!.proofEvent.tags.map((tag) =>
        tag[0] === "e"
          ? ["e", "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"]
          : [...tag],
      ),
    });

    expect(result).toEqual({
      ok: false,
      code: "digest_mismatch",
      reason:
        "OTS proof digest 03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340 does not match target event id ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      proofEventId: "abababababababababababababababababababababababababababababababab",
    });
  });
});
