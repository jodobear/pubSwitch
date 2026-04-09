import { describe, expect, test } from "bun:test";
import { getLiveDemoPackages } from "../demo-packages";
import { filterPackagesForDemoShape, getDefaultPackageIdForDemoShape } from "../demo-shapes";

describe("demo shapes", () => {
  test("filter packages into the six explicit demo acts", async () => {
    const packages = await getLiveDemoPackages();

    expect(filterPackagesForDemoShape(packages, "onboarding").map((entry) => entry.id)).toEqual([
      "pending-ots",
    ]);
    expect(filterPackagesForDemoShape(packages, "path-a-live").every((entry) => entry.lane === "path-a")).toBe(
      true,
    );
    expect(filterPackagesForDemoShape(packages, "follower-view").every((entry) => entry.lane === "path-a")).toBe(
      true,
    );
    expect(filterPackagesForDemoShape(packages, "path-c-replay").every((entry) => entry.lane === "path-c")).toBe(
      true,
    );
  });

  test("choose sensible defaults for each act", async () => {
    const packages = await getLiveDemoPackages();

    expect(getDefaultPackageIdForDemoShape(packages, "onboarding")).toBe("pending-ots");
    expect(getDefaultPackageIdForDemoShape(packages, "path-a-live")).toBe("confirmed-authority");
    expect(getDefaultPackageIdForDemoShape(packages, "path-a-replay")).toBe("conflicting-roots");
    expect(getDefaultPackageIdForDemoShape(packages, "follower-view")).toBe("executed-happy-path");
    expect(getDefaultPackageIdForDemoShape(packages, "path-c-live")).toBe("socially-supported");
    expect(getDefaultPackageIdForDemoShape(packages, "path-c-replay")).toBe("socially-split");
  });
});
