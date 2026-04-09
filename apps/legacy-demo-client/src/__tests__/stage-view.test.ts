import { describe, expect, test } from "bun:test";
import { buildPathAStageScene, buildPathCStageScene } from "../stage-view";

describe("stage view helpers", () => {
  test("uses follower framing for follower-view path-a scenes", () => {
    const scene = buildPathAStageScene({
      shape: "follower-view",
      shapeMeta: {
        id: "follower-view",
        label: "Follower View",
        title: "What followers see.",
        detail: "Banner, evidence, attestation.",
      },
      title: "Identity continues on the new key",
      stepTitle: "Identity continues on the new key",
      stepDetail: "Rotation executed cleanly.",
      state: { state: "executed", newPubkey: "a".repeat(64) },
    });

    expect(scene.title).toContain("Follower sees");
    expect(scene.resultLabel).toBe("executed");
    expect(scene.tone).toBe("ok");
  });

  test("maps split social state to a warning scene", () => {
    const scene = buildPathCStageScene({
      shapeMeta: {
        id: "path-c-replay",
        label: "Path C Replay",
        title: "Step through Path C.",
        detail: "Support, oppose, split.",
      },
      title: "Social continuity is split",
      stepTitle: "Social continuity is split",
      stepDetail: "Followed third parties disagree.",
      state: {
        state: "socially_split",
        oldPubkey: "a".repeat(64),
        newPubkey: "b".repeat(64),
        claimIds: ["c".repeat(64)],
        claimRoles: ["old"],
        supportPubkeys: ["d".repeat(64)],
        opposePubkeys: ["e".repeat(64)],
        selfAssertedSupportPubkeys: [],
        selfAssertedOpposePubkeys: [],
      },
    });

    expect(scene.resultLabel).toBe("socially_split");
    expect(scene.tone).toBe("warn");
  });
});
