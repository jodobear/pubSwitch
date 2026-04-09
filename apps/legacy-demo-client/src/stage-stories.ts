import type { DemoShapeId } from "./demo-shapes";

export type StageStoryId =
  | "sign-up"
  | "happy"
  | "followers"
  | "social"
  | "contested";

export type Perspective = "key-holder" | "follower" | "observer";

export type StageStory = {
  id: StageStoryId;
  label: string;
  protocolLabel: string;
  detail: string;
  perspective: Perspective;
  perspectiveLabel: string;
  shapeId: DemoShapeId;
  packageId: string;
};

export const STAGE_STORIES: StageStory[] = [
  {
    id: "sign-up",
    label: "Sign Up",
    protocolLabel: "Prepared Migration",
    detail: "Create a key, protect it with a passphrase, then publish migration authority and timestamp proof.",
    perspective: "key-holder",
    perspectiveLabel: "You are the key holder",
    shapeId: "onboarding",
    packageId: "pending-ots",
  },
  {
    id: "happy",
    label: "Prepared Migration",
    protocolLabel: "Prepared Migration",
    detail: "A clean cryptographic move from the old key to one successor.",
    perspective: "key-holder",
    perspectiveLabel: "You are the key holder",
    shapeId: "path-a-live",
    packageId: "executed-happy-path",
  },
  {
    id: "followers",
    label: "What Followers See",
    protocolLabel: "Prepared Migration",
    detail: "How a follower client reacts when someone they follow rotates keys.",
    perspective: "follower",
    perspectiveLabel: "You are a follower of this key",
    shapeId: "follower-view",
    packageId: "executed-happy-path",
  },
  {
    id: "social",
    label: "Social Confirmation",
    protocolLabel: "Social Transition",
    detail: "Claims and attestations from people you already follow.",
    perspective: "observer",
    perspectiveLabel: "You are viewing this profile",
    shapeId: "path-c-live",
    packageId: "socially-supported",
  },
  {
    id: "contested",
    label: "Contested Case",
    protocolLabel: "Prepared Migration",
    detail: "What happens when the protocol becomes ambiguous. No auto-follow.",
    perspective: "observer",
    perspectiveLabel: "You are viewing this profile",
    shapeId: "path-a-replay",
    packageId: "conflicting-executions",
  },
];

export function getStageStory(id: StageStoryId): StageStory {
  return STAGE_STORIES.find((story) => story.id === id) ?? STAGE_STORIES[0]!;
}
