import {
  getPathARealOtsCorpus,
  inspectPathARealOtsCorpusItem,
} from "../apps/ots-helper/src/path-a-real-corpus";
import { getPathARealOtsCorpus as getPurePathARealOtsCorpus } from "../packages/fixtures/src/index";

const corpus = await getPathARealOtsCorpus();
const pureCorpus = getPurePathARealOtsCorpus();
let hasMismatch = false;

for (const item of corpus) {
  const inspection = inspectPathARealOtsCorpusItem(item);
  const pureItem = pureCorpus.find((entry) => entry.id === item.id);
  const matches = inspection.ok;

  console.log(
    `${matches ? "PASS" : "FAIL"} ${item.id}: source=${pureItem ? "shared_pure_corpus" : "missing_pure_corpus"} authority=${inspection.authorityId} expected_status=${item.expectedStatus} expected_anchor=${item.expectedAnchorHeight ?? "(none)"} event_id_match=${inspection.eventIdMatchesEnvelope} preimage_match=${inspection.preimageDigestMatchesAuthorityId} canonical_preimage_match=${inspection.canonicalPreimageMatches} helper=${JSON.stringify(inspection.helperInspection)}`,
  );

  if (!matches || !pureItem) {
    hasMismatch = true;
  }
}

if (hasMismatch) {
  process.exitCode = 1;
}
