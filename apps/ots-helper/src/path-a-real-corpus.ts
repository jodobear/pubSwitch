import {
  getPathARealOtsCorpus as getPurePathARealOtsCorpus,
  getPathARealOtsCorpusItem as getPurePathARealOtsCorpusItem,
  type PathARealOtsCorpusItem,
} from "../../../packages/fixtures/src/path-a-real-ots";
import { computeNostrEventIdSync, sha256HexSync, type EventId } from "../../../packages/protocol-shared/src/index";
import { type InvalidOtsProof, type InspectedOtsProof } from "./inspect";
import { inspectOtsProofEventWithRealVerification } from "./real-inspect";

const TEXT_ENCODER = new TextEncoder();

export { type PathARealOtsCorpusItem };

export type PathARealOtsCorpusInspection = {
  ok: boolean;
  corpusId: string;
  authorityId: EventId;
  eventIdMatchesEnvelope: boolean;
  preimageDigestMatchesAuthorityId: boolean;
  canonicalPreimageMatches: boolean;
  expectedStatusMatches: boolean;
  expectedAnchorHeightMatches: boolean;
  helperInspection: InspectedOtsProof | InvalidOtsProof;
};

export async function getPathARealOtsCorpus(): Promise<PathARealOtsCorpusItem[]> {
  return getPurePathARealOtsCorpus();
}

export async function getPathARealOtsCorpusItem(
  id: string,
): Promise<PathARealOtsCorpusItem | undefined> {
  return getPurePathARealOtsCorpusItem(id);
}

export async function inspectPathARealOtsCorpus(): Promise<PathARealOtsCorpusInspection[]> {
  return getPurePathARealOtsCorpus().map((item) => inspectPathARealOtsCorpusItem(item));
}

export function inspectPathARealOtsCorpusItem(
  item: PathARealOtsCorpusItem,
): PathARealOtsCorpusInspection {
  const authorityId = item.authorityEvent.id as EventId;
  const helperInspection = inspectOtsProofEventWithRealVerification(item.proofEvent);
  const canonicalPreimage = encodeCanonicalEventPreimage(item);

  return {
    ok:
      computeNostrEventIdSync(item.authorityEvent) === authorityId &&
      sha256HexSync(TEXT_ENCODER.encode(item.authorityPreimage)) === authorityId &&
      item.authorityPreimage === canonicalPreimage &&
      helperInspection.ok &&
      helperInspection.targetEventId === authorityId &&
      helperInspection.status === item.expectedStatus &&
      helperInspection.anchorHeight === item.expectedAnchorHeight,
    corpusId: item.id,
    authorityId,
    eventIdMatchesEnvelope: computeNostrEventIdSync(item.authorityEvent) === authorityId,
    preimageDigestMatchesAuthorityId:
      sha256HexSync(TEXT_ENCODER.encode(item.authorityPreimage)) === authorityId,
    canonicalPreimageMatches: item.authorityPreimage === canonicalPreimage,
    expectedStatusMatches: helperInspection.ok && helperInspection.status === item.expectedStatus,
    expectedAnchorHeightMatches:
      helperInspection.ok && helperInspection.anchorHeight === item.expectedAnchorHeight,
    helperInspection,
  };
}

function encodeCanonicalEventPreimage(item: PathARealOtsCorpusItem): string {
  return JSON.stringify([
    0,
    item.authorityEvent.pubkey,
    item.authorityEvent.created_at,
    item.authorityEvent.kind,
    item.authorityEvent.tags,
    item.authorityEvent.content,
  ]);
}
