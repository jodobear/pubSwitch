import { describe, expect, test } from "bun:test";
import { getLiveDemoPackages, extractCalendarHints } from "../demo-packages";
import { buildPackageSubscriptionFilters, parseRelayUrls } from "../public-relay";

describe("live demo package helpers", () => {
  test("builds real path-a packages with publishable actors and actions", async () => {
    const packages = await getLiveDemoPackages();
    const pending = packages.find((entry) => entry.id === "pending-ots");

    expect(pending).toBeDefined();
    expect(pending?.lane).toBe("path-a");
    expect(pending?.noteActors.length).toBeGreaterThan(0);
    expect(pending?.preparedActions.map((action) => action.title)).toEqual([
      "Migration authority (1776)",
      "Timestamp proof (1040)",
    ]);
  });

  test("orders executed happy-path publish actions in human protocol order", async () => {
    const packages = await getLiveDemoPackages();
    const happy = packages.find((entry) => entry.id === "executed-happy-path");

    expect(happy?.preparedActions.map((action) => action.title)).toEqual([
      "Migration authority (1776)",
      "Timestamp proof (1040)",
      "Authority update (1779)",
      "Timestamp proof (1040)",
      "Execution (1777)",
      "Execution (1777)",
    ]);
  });

  test("extracts OTS calendar hints from pending proof bytes", async () => {
    const packages = await getLiveDemoPackages();
    const pending = packages.find((entry) => entry.id === "pending-ots");
    if (!pending || pending.lane !== "path-a") {
      throw new Error("missing pending package");
    }

    const proof = pending.scenario.otsProofs[0];
    expect(extractCalendarHints(proof!)).toEqual(["https://alice.btc.calendar.opentimestamps.org"]);
  });

  test("builds package relay filters and normalizes relay url input", async () => {
    const packages = await getLiveDemoPackages();
    const pathA = packages.find((entry) => entry.id === "confirmed-authority");
    const pathC = packages.find((entry) => entry.id === "socially-supported");
    if (!pathA) {
      throw new Error("missing confirmed-authority package");
    }
    if (!pathC) {
      throw new Error("missing socially-supported package");
    }

    expect(parseRelayUrls("wss://relay.damus.io\nwss://relay.damus.io, wss://nos.lol")).toEqual([
      "wss://relay.damus.io",
      "wss://nos.lol",
    ]);

    const pathAFilters = buildPackageSubscriptionFilters(pathA, 12345);
    expect(pathAFilters).toHaveLength(3);
    expect(pathAFilters[0]).toMatchObject({ since: 12345, kinds: [1] });
    expect(pathAFilters[1]?.ids?.length).toBe(pathA.scenario.events.length);
    expect(pathAFilters[2]?.ids?.length).toBe(pathA.scenario.otsProofs.length);

    const pathCFilters = buildPackageSubscriptionFilters(pathC, 12345);
    expect(pathCFilters).toHaveLength(3);
    expect(pathCFilters[0]).toMatchObject({ since: 12345, kinds: [1] });
    expect(pathCFilters[1]?.ids?.length).toBe(pathC.scenario.claims.length);
    expect(pathCFilters[2]?.ids?.length).toBe(pathC.scenario.attestations.length);
  });
});
