import { describe, expect, test } from "bun:test";
import { getLiveDemoPackages } from "../demo-packages";
import {
  buildFollowerRotationNotice,
  buildScenarioPrompt,
  buildSignupState,
  describeIdentityState,
  describeObservedEvent,
  getSuggestedPathCPackageIdForPathA,
} from "../operator-view";

describe("operator view helpers", () => {
  test("builds a concise scenario prompt for the live console", async () => {
    const packages = await getLiveDemoPackages();
    const pending = packages.find((entry) => entry.id === "pending-ots");
    if (!pending) {
      throw new Error("missing pending package");
    }

    expect(buildScenarioPrompt(pending)).toContain("pending OTS");
  });

  test("describes path-a identity state with authority context", async () => {
    const packages = await getLiveDemoPackages();
    const confirmed = packages.find((entry) => entry.id === "real-confirmed-pma");
    if (!confirmed || confirmed.lane !== "path-a") {
      throw new Error("missing confirmed path-a package");
    }

    const label = describeIdentityState({
      demoPackage: confirmed,
      pathAState: {
        state: "bitcoin_confirmed",
        authorityId: confirmed.scenario.events[0]!.id!,
      },
      pathCStateText: "none",
    });

    expect(label).toContain("bitcoin_confirmed");
    expect(label).toContain("b8eac2d6d0");
  });

  test("describes observed proof events as feed rows", async () => {
    const packages = await getLiveDemoPackages();
    const pending = packages.find((entry) => entry.id === "pending-ots");
    if (!pending || pending.lane !== "path-a") {
      throw new Error("missing pending package");
    }

    expect(describeObservedEvent(pending.scenario.otsProofs[0]!)).toContain("OTS proof");
  });

  test("models signup readiness and auto-publish gating", () => {
    expect(
      buildSignupState({
        handle: "alice",
        passphrase: "secret",
        confirmPassphrase: "secret",
        bundleReady: true,
        connected: true,
        pmaSent: false,
        proofSent: false,
      }),
    ).toMatchObject({
      canCreatePackage: true,
      canFinishSignup: true,
      stageLabel: "ready to publish",
    });
  });

  test("builds a follower-facing banner when execution lands", () => {
    expect(
      buildFollowerRotationNotice({
        pathAState: { state: "executed", newPubkey: "b".repeat(64) },
        observedProtocolKinds: [1776, 1040, 1779, 1777],
      }),
    ).toMatchObject({
      tone: "ok",
      showAttestAction: true,
      recommendedAction: "accept",
    });
  });

  test("keeps follower notice cautious for pending and conflict states", () => {
    expect(
      buildFollowerRotationNotice({
        pathAState: { state: "published_pending_ots" },
        observedProtocolKinds: [1776, 1040],
      }),
    ).toMatchObject({
      tone: "warn",
      showAttestAction: false,
      recommendedAction: "inspect",
    });

    expect(
      buildFollowerRotationNotice({
        pathAState: {
          state: "conflict",
          conflictKind: "multiple_roots",
          authorityIds: ["a".repeat(64), "b".repeat(64)],
        },
        observedProtocolKinds: [1776, 1040],
      }),
    ).toMatchObject({
      tone: "error",
      showAttestAction: false,
      recommendedAction: "reject",
    });
  });

  test("maps path-a states to a sensible path-c attestation package", () => {
    expect(getSuggestedPathCPackageIdForPathA("executed-happy-path")).toBe("socially-supported");
    expect(getSuggestedPathCPackageIdForPathA("conflicting-executions")).toBe("socially-split");
    expect(getSuggestedPathCPackageIdForPathA("pending-ots")).toBe("claim-only");
  });
});
