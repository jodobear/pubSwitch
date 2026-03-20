import type { DemoShapeId } from "./demo-shapes";

export type StageStoryId =
  | "sign-up"
  | "happy"
  | "followers"
  | "social"
  | "contested";

export type StageStory = {
  id: StageStoryId;
  label: string;
  shapeId: DemoShapeId;
  packageId: string;
};

export const STAGE_STORIES: StageStory[] = [
  {
    id: "sign-up",
    label: "Sign Up",
    shapeId: "onboarding",
    packageId: "pending-ots",
  },
  {
    id: "happy",
    label: "Happy Rotation",
    shapeId: "path-a-live",
    packageId: "executed-happy-path",
  },
  {
    id: "followers",
    label: "What Followers See",
    shapeId: "follower-view",
    packageId: "executed-happy-path",
  },
  {
    id: "social",
    label: "Social Confirmation",
    shapeId: "path-c-live",
    packageId: "socially-supported",
  },
  {
    id: "contested",
    label: "Contested Case",
    shapeId: "path-a-replay",
    packageId: "conflicting-executions",
  },
];

export function getStageStory(id: StageStoryId): StageStory {
  return STAGE_STORIES.find((story) => story.id === id) ?? STAGE_STORIES[0]!;
}
