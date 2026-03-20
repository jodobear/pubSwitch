import {
  type PathAFixtureScenario,
  getPathAFixtureScenario,
  getPathCFixtureScenario,
} from "../packages/fixtures/src/index";

const scenarioId = Bun.argv[2] ?? "executed-happy-path";
const pathAScenario = await getPathAFixtureScenario(scenarioId);
const pathCScenario = pathAScenario ? undefined : await getPathCFixtureScenario(scenarioId);

if (!pathAScenario && !pathCScenario) {
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

if (pathCScenario) {
  console.log(`# Publish plan for path-c:${pathCScenario.id}`);
  console.log(`# ${pathCScenario.title}`);

  for (const claim of pathCScenario.claims) {
    printPublishEvent(claim);
  }

  for (const attestation of pathCScenario.attestations) {
    printPublishEvent(attestation);
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
}) {
  console.log(
    JSON.stringify({
      publish: {
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
