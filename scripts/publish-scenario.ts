import {
  type PathAFixtureScenario,
  getPathAFixtureScenario,
  getPathAV3FixtureScenario,
  getPathCFixtureScenario,
} from "../packages/fixtures/src/index";
import {
  buildPreparedBundleFromScenario,
  buildPreparedPublishPlan,
  buildSocialBundleFromScenario,
  buildSocialPublishPlan,
  cliInspectTransition,
  writePreparedBundle,
  writeSocialBundle,
} from "./protocol-cli-lib";

const scenarioId = Bun.argv[2] ?? "executed-happy-path";
const pathAScenario = await getPathAFixtureScenario(scenarioId);
const pathAV3Scenario = pathAScenario ? undefined : await getPathAV3FixtureScenario(scenarioId);
const pathCScenario = pathAScenario || pathAV3Scenario ? undefined : await getPathCFixtureScenario(scenarioId);
const asJson = Bun.argv.includes("--json");
const asBundle = Bun.argv.includes("--bundle");

if (!pathAScenario && !pathAV3Scenario && !pathCScenario) {
  console.error(`Unknown scenario: ${scenarioId}`);
  process.exit(1);
}

if (pathAScenario) {
  console.log(`# Publish plan for path-a:${pathAScenario.id}`);
  console.log(`# ${pathAScenario.title}`);
  console.log(
    `# proof backing: ${pathAScenario.proofBacking} (${describeProofBacking(pathAScenario.proofBacking)})`,
  );
  const corpusIds = pathAScenario.realOtsCorpusIds ?? (pathAScenario.realOtsCorpusId ? [pathAScenario.realOtsCorpusId] : []);
  if (corpusIds.length > 0) {
    console.log(`# shared real corpus: ${corpusIds.join(", ")}`);
  }

  for (const event of pathAScenario.events) {
    printPublishEvent(event);
  }

  for (const proof of pathAScenario.otsProofs) {
    printPublishEvent(proof);
  }
}

if (pathAV3Scenario) {
  const bundle = buildPreparedBundleFromScenario(pathAV3Scenario);
  if (asBundle) {
    console.log(writePreparedBundle(bundle));
    process.exit(0);
  }

  const inspected = await cliInspectTransition({ preparedBundle: bundle });
  const publishPlan = buildPreparedPublishPlan(bundle);
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          path: "path-a-v3",
          scenarioId: pathAV3Scenario.id,
          title: pathAV3Scenario.title,
          preparedState: inspected.prepared ?? { state: "none" },
          bundle,
          publishPlan: publishPlan.map((entry) => ({
            step: entry.step,
            targetEventId: entry.targetEventId,
            event: entry.event,
          })),
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  console.log(`# Publish plan for path-a-v3:${pathAV3Scenario.id}`);
  console.log(`# ${pathAV3Scenario.title}`);
  console.log(`# prepared state: ${inspected.prepared?.state ?? "none"}`);
  console.log(`# bundle: ${bundle.type} events=${bundle.events.length} proofs=${bundle.otsProofs.length}`);

  for (const entry of publishPlan) {
    printPublishEvent(entry.event, entry.step, entry.targetEventId);
  }
}

if (pathCScenario) {
  const bundle = buildSocialBundleFromScenario(pathCScenario);
  if (asBundle) {
    console.log(writeSocialBundle(bundle));
    process.exit(0);
  }

  const inspected = await cliInspectTransition({
    socialBundle: bundle,
    viewerFollowSet: new Set(pathCScenario.viewerFollowPubkeys),
  });
  const publishPlan = buildSocialPublishPlan(bundle);
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          path: "path-c",
          scenarioId: pathCScenario.id,
          title: pathCScenario.title,
          socialState: inspected.social ?? { state: "none" },
          bundle,
          publishPlan: publishPlan.map((entry) => ({
            step: entry.step,
            event: entry.event,
          })),
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  console.log(`# Publish plan for path-c:${pathCScenario.id}`);
  console.log(`# ${pathCScenario.title}`);
  console.log(`# social state: ${inspected.social?.state ?? "none"}`);
  console.log(`# bundle: ${bundle.type} events=${bundle.events.length}`);

  for (const entry of publishPlan) {
    printPublishEvent(entry.event, entry.step);
  }
}

function printPublishEvent(event: {
  id?: string;
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
  sig?: string;
}, step?: string, targetEventId?: string) {
  console.log(
    JSON.stringify({
      publish: {
        step,
        targetEventId,
        id: event.id,
        kind: event.kind,
        pubkey: event.pubkey,
        created_at: event.created_at,
        tags: event.tags,
        content: event.content,
        sig: event.sig,
      },
    }),
  );
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
