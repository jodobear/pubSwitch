import type { PreparedMigrationState } from "@tack/protocol-a";
import type { SocialTransitionState } from "@tack/protocol-c";
import type { DemoShapeId, DemoShape } from "./demo-shapes";

export type StageScene = {
  title: string;
  subtitle: string;
  resultLabel: string;
  tone: "neutral" | "ok" | "warn" | "error";
};

export function buildPathAStageScene(input: {
  shape: DemoShapeId;
  shapeMeta: DemoShape;
  title: string;
  stepTitle: string;
  stepDetail: string;
  state: PreparedMigrationState;
}): StageScene {
  if (input.shape === "follower-view") {
    return {
      title: `Follower sees: ${input.stepTitle}`,
      subtitle: input.stepDetail,
      resultLabel: formatPathAState(input.state),
      tone: toneFromPathAState(input.state),
    };
  }

  return {
    title: input.title,
    subtitle: input.stepDetail,
    resultLabel: formatPathAState(input.state),
    tone: toneFromPathAState(input.state),
  };
}

export function buildPathCStageScene(input: {
  shapeMeta: DemoShape;
  title: string;
  stepTitle: string;
  stepDetail: string;
  state: SocialTransitionState;
}): StageScene {
  return {
    title: input.title,
    subtitle: input.stepDetail,
    resultLabel: input.state.state,
    tone:
      input.state.state === "socially_supported"
        ? "ok"
        : input.state.state === "socially_opposed"
          ? "error"
          : input.state.state === "socially_split" || input.state.state === "claimed"
            ? "warn"
            : "neutral",
  };
}

export function formatPathAState(state: PreparedMigrationState): string {
  switch (state.state) {
    case "draft_local":
    case "none":
    case "published_pending_ots":
      return state.state;
    case "bitcoin_confirmed":
      return "bitcoin_confirmed";
    case "executed":
      return "executed";
    case "conflict":
      return state.conflictKind;
  }
}

function toneFromPathAState(state: PreparedMigrationState): StageScene["tone"] {
  switch (state.state) {
    case "bitcoin_confirmed":
    case "executed":
      return "ok";
    case "published_pending_ots":
      return "warn";
    case "conflict":
      return state.conflictKind === "multiple_roots" ? "error" : "warn";
    default:
      return "neutral";
  }
}
