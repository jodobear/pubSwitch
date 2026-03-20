import { getOtsDemoVector, getOtsDemoVectors } from "./demo-vectors";
import {
  getPathARealOtsCorpus,
  getPathARealOtsCorpusItem,
  inspectPathARealOtsCorpus,
  inspectPathARealOtsCorpusItem,
} from "./path-a-real-corpus";
import {
  inspectOtsProofEventWithRealVerification,
  inspectPathAScenarioProofsWithRealVerification,
} from "./real-inspect";

declare const Bun: {
  argv: string[];
  stdin: ReadableStream<Uint8Array>;
};

await main();

async function main() {
  const [command, ...args] = Bun.argv.slice(2);

  if (!command || command === "help" || command === "--help") {
    await printUsage();
    return;
  }

  if (command === "inspect-scenario") {
    const scenarioId = args[0];

    if (!scenarioId) {
      throw new Error("inspect-scenario requires a scenario id");
    }

    const result = await inspectPathAScenarioProofsWithRealVerification(scenarioId);
    console.log(JSON.stringify(result, null, 2));

    if ("ok" in result && result.ok === false) {
      throw new Error(result.reason);
    }

    return;
  }

  if (command === "inspect-stdin") {
    const rawInput = await readAllStdin();

    if (!rawInput.trim()) {
      throw new Error("inspect-stdin requires a JSON event on stdin");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawInput);
    } catch (error) {
      throw new Error(`Failed to parse stdin JSON: ${getErrorMessage(error)}`);
    }

    const result = inspectOtsProofEventWithRealVerification(
      parsed as Parameters<typeof inspectOtsProofEventWithRealVerification>[0],
    );
    console.log(JSON.stringify(result, null, 2));

    if (!result.ok) {
      throw new Error(result.reason);
    }

    return;
  }

  if (command === "inspect-vector") {
    const vectorId = args[0];

    if (!vectorId) {
      throw new Error("inspect-vector requires a vector id");
    }

    const vector = getOtsDemoVector(vectorId);
    if (!vector) {
      throw new Error(`Unknown OTS demo vector: ${vectorId}`);
    }

    const result = inspectOtsProofEventWithRealVerification(vector.proofEvent);
    console.log(
      JSON.stringify(
        {
          vector: {
            id: vector.id,
            title: vector.title,
            targetEventId: vector.targetEventId,
            expectedStatus: vector.expectedStatus,
            expectedAnchorHeight: vector.expectedAnchorHeight,
          },
          inspection: result,
        },
        null,
        2,
      ),
    );

    if (!result.ok) {
      throw new Error(result.reason);
    }

    return;
  }

  if (command === "inspect-corpus") {
    const corpusId = args[0];

    if (corpusId) {
      const item = await getPathARealOtsCorpusItem(corpusId);
      if (!item) {
        throw new Error(`Unknown real Path A corpus item: ${corpusId}`);
      }

      console.log(
        JSON.stringify(
          {
            corpus: {
              id: item.id,
              source: "shared_pure_corpus",
              title: item.title,
              note: item.note,
              authorityEventId: item.authorityEvent.id,
              expectedStatus: item.expectedStatus,
              expectedAnchorHeight: item.expectedAnchorHeight,
            },
            inspection: inspectPathARealOtsCorpusItem(item),
          },
          null,
          2,
        ),
      );

      return;
    }

    console.log(JSON.stringify(await inspectPathARealOtsCorpus(), null, 2));
    return;
  }

  await printUsage();
  throw new Error(`Unknown command: ${command}`);
}

async function printUsage() {
  console.log("tack ots-helper");
  console.log("");
  console.log("Commands:");
  console.log("  inspect-scenario <path-a-scenario-id>");
  console.log("  inspect-corpus [real-path-a-corpus-id]");
  console.log("  inspect-vector <demo-vector-id>");
  console.log("  inspect-stdin");
  console.log("");
  console.log("Real Path A corpus:");
  for (const item of await getPathARealOtsCorpus()) {
    console.log(`  ${item.id}`);
  }
  console.log("");
  console.log("Demo vectors:");
  for (const vector of getOtsDemoVectors()) {
    console.log(`  ${vector.id}`);
  }
}

async function readAllStdin(): Promise<string> {
  return new Response(Bun.stdin).text();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
