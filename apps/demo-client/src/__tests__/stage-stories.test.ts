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
      shapeId: "path-a-live",
      packageId: "executed-happy-path",
    });
    expect(getStageStory("contested")).toMatchObject({
      protocolLabel: "Prepared Migration",
      shapeId: "path-a-replay",
      packageId: "conflicting-executions",
    });
  });
});
