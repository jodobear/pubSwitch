import {
  getPathAFixtureScenario,
  getPathAFixtureScenarios,
  getPathCFixtureScenario,
  getPathCFixtureScenarios,
} from "../packages/fixtures/src/index";

const scenarioId = Bun.argv[2];

const scenarios = scenarioId
  ? await resolveSingleScenario(scenarioId)
  : {
      pathA: await getPathAFixtureScenarios(),
      pathC: await getPathCFixtureScenarios(),
    };

console.log(JSON.stringify(scenarios, null, 2));

async function resolveSingleScenario(id: string) {
  const pathAScenario = await getPathAFixtureScenario(id);
  if (pathAScenario) {
    return pathAScenario;
  }

  const pathCScenario = await getPathCFixtureScenario(id);
  if (pathCScenario) {
    return pathCScenario;
  }

  console.error(`Unknown scenario: ${id}`);
  process.exitCode = 1;
  return [];
}
