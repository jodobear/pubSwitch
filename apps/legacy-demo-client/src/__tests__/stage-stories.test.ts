import { describe, expect, test } from "bun:test";
import { getStageStory, STAGE_STORIES } from "../stage-stories";

describe("stage stories", () => {
  test("keeps the presentation stories narrow and ordered", () => {
    expect(STAGE_STORIES.map((story) => story.id)).toEqual([
      "sign-up",
      "happy",
      "followers",
      "social",
      "contested",
    ]);
  });

  test("maps the happy and contested stories to the intended packages", () => {
    expect(getStageStory("happy")).toMatchObject({
      label: "Prepared Migration",
      perspective: "key-holder",
      shapeId: "path-a-live",
      packageId: "executed-happy-path",
    });
    expect(getStageStory("contested")).toMatchObject({
      protocolLabel: "Prepared Migration",
      perspective: "observer",
      shapeId: "path-a-replay",
      packageId: "conflicting-executions",
    });
  });

  test("assigns clear perspectives to each story", () => {
    expect(getStageStory("sign-up").perspective).toBe("key-holder");
    expect(getStageStory("happy").perspective).toBe("key-holder");
    expect(getStageStory("followers").perspective).toBe("follower");
    expect(getStageStory("social").perspective).toBe("observer");
    expect(getStageStory("contested").perspective).toBe("observer");
  });
});
