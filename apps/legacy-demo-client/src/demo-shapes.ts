import type { LiveDemoPackage } from "./demo-packages";

export type DemoShapeId =
  | "onboarding"
  | "path-a-live"
  | "path-a-replay"
  | "follower-view"
  | "path-c-live"
  | "path-c-replay";

export type DemoShape = {
  id: DemoShapeId;
  label: string;
  title: string;
  detail: string;
};

export const DEMO_SHAPES: DemoShape[] = [
  {
    id: "onboarding",
    label: "Onboarding",
    title: "Create package, backup, publish.",
    detail: "1776 + 1040 onboarding flow.",
  },
  {
    id: "path-a-live",
    label: "Path A Live",
    title: "Live notes + Path A events.",
    detail: "Cryptographic continuity on relays.",
  },
  {
    id: "path-a-replay",
    label: "Path A Replay",
    title: "Step through Path A.",
    detail: "Conflicts and edge cases.",
  },
  {
    id: "follower-view",
    label: "Follower View",
    title: "What followers see.",
    detail: "Banner, evidence, attestation.",
  },
  {
    id: "path-c-live",
    label: "Path C Live",
    title: "Live claims + attestations.",
    detail: "Advisory continuity only.",
  },
  {
    id: "path-c-replay",
    label: "Path C Replay",
    title: "Step through Path C.",
    detail: "Support, oppose, split.",
  },
];

export function getDemoShapeMeta(shapeId: DemoShapeId): DemoShape {
  return DEMO_SHAPES.find((entry) => entry.id === shapeId) ?? DEMO_SHAPES[0]!;
}

export function filterPackagesForDemoShape(
  packages: LiveDemoPackage[],
  shapeId: DemoShapeId,
): LiveDemoPackage[] {
  switch (shapeId) {
    case "onboarding":
      return packages.filter((entry) => entry.id === "pending-ots");
    case "path-a-live":
    case "path-a-replay":
    case "follower-view":
      return packages.filter((entry) => entry.lane === "path-a");
    case "path-c-live":
    case "path-c-replay":
      return packages.filter((entry) => entry.lane === "path-c");
  }
}

export function getDefaultPackageIdForDemoShape(
  packages: LiveDemoPackage[],
  shapeId: DemoShapeId,
): string | undefined {
  const visible = filterPackagesForDemoShape(packages, shapeId);

  switch (shapeId) {
    case "onboarding":
      return visible.find((entry) => entry.id === "pending-ots")?.id;
    case "path-a-live":
      return visible.find((entry) => entry.id === "confirmed-authority")?.id ?? visible[0]?.id;
    case "path-a-replay":
      return visible.find((entry) => entry.id === "conflicting-roots")?.id ?? visible[0]?.id;
    case "follower-view":
      return visible.find((entry) => entry.id === "executed-happy-path")?.id ?? visible[0]?.id;
    case "path-c-live":
      return visible.find((entry) => entry.id === "socially-supported")?.id ?? visible[0]?.id;
    case "path-c-replay":
      return visible.find((entry) => entry.id === "socially-split")?.id ?? visible[0]?.id;
  }
}
