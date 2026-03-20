import { isDeepStrictEqual } from "node:util";
import { summarizePathAProofBridge } from "../apps/ots-helper/src/path-a-proof-bridge";
import {
  type PathAFixtureScenario,
  evaluatePathAFixtureScenario,
  evaluatePathCFixtureScenario,
  getPathAFixtureScenario,
  getPathAFixtureScenarios,
  getPathCFixtureScenario,
  getPathCFixtureScenarios,
} from "../packages/fixtures/src/index";

const scenarioId = Bun.argv[2];
const scenarios = scenarioId
  ? await resolveSingleScenario(scenarioId)
  : [
      ...(await getPathAFixtureScenarios()).map((scenario) => ({ path: "path-a" as const, scenario })),
      ...(await getPathCFixtureScenarios()).map((scenario) => ({ path: "path-c" as const, scenario })),
    ];

let hasMismatch = false;

for (const entry of scenarios) {
  const resolved =
    entry.path === "path-a"
      ? evaluatePathAFixtureScenario(entry.scenario)
      : await evaluatePathCFixtureScenario(entry.scenario);
  const stateMatches = isDeepStrictEqual(resolved, entry.scenario.expectedState);
  const helperSummary =
    entry.path === "path-a"
      ? summarizePathAProofBridge({
          scenario: entry.scenario,
          resolvedState: resolved,
        })
      : undefined;
  const matches = stateMatches && (helperSummary?.ok ?? true);

  console.log(
    `${matches ? "PASS" : "FAIL"} ${entry.path}:${entry.scenario.id}: expected=${JSON.stringify(entry.scenario.expectedState)} actual=${JSON.stringify(resolved)}${entry.path === "path-a" ? ` proof_backing=${entry.scenario.proofBacking} proof_backing_label=${JSON.stringify(describeProofBacking(entry.scenario.proofBacking))}${formatRealCorpusIds(entry.scenario)}` : ""}${helperSummary ? ` helper_status=${helperSummary.helperStatus} helper_authority=${helperSummary.authorityId ?? "(none)"} helper=${JSON.stringify(helperSummary)}` : ""}`,
  );

  if (!matches) {
    hasMismatch = true;
  }
}

if (hasMismatch) {
  process.exitCode = 1;
}

async function resolveSingleScenario(id: string) {
  const pathAScenario = await getPathAFixtureScenario(id);
  if (pathAScenario) {
    return [{ path: "path-a" as const, scenario: pathAScenario }];
  }

  const pathCScenario = await getPathCFixtureScenario(id);
  if (pathCScenario) {
    return [{ path: "path-c" as const, scenario: pathCScenario }];
  }

  console.error(`Unknown scenario: ${id}`);
  process.exitCode = 1;
  return [];
}

function describeProofBacking(value: PathAFixtureScenario["proofBacking"]): string {
  if (value === "real_helper_verified") {
    return "real helper-verified OTS";
  }

  if (value === "mixed_real_root") {
    return "mixed real root plus placeholder chain proofs";
  }

  return "placeholder proof metadata";
}

function formatRealCorpusIds(scenario: PathAFixtureScenario): string {
  const corpusIds = scenario.realOtsCorpusIds ?? (scenario.realOtsCorpusId ? [scenario.realOtsCorpusId] : []);
  if (corpusIds.length === 0) {
    return "";
  }

  return ` real_corpus=${corpusIds.join(",")}`;
}
