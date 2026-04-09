import { getPathARealOtsCorpus } from "../../../packages/fixtures/src/index";

type Tone = "ok" | "warn";

export type PathARealOtsSnapshotCard = {
  id: string;
  title: string;
  note: string;
  tone: Tone;
  statusCode: "pending" | "bitcoin_confirmed";
  authorityEventId: string;
  proofEventId: string;
  proofContentLength: number;
  anchorHeight?: number;
};

export type PathARealOtsProvenanceCard = {
  source: "helper" | "app";
  title: string;
  items: string[];
};

export type PathARealOtsViewModel = {
  cards: PathARealOtsSnapshotCard[];
  provenance: PathARealOtsProvenanceCard[];
};

export function buildPathARealOtsViewModel(): PathARealOtsViewModel {
  const cards = getPathARealOtsCorpus().map((item) => ({
    id: item.id,
    title: item.title,
    note: item.note,
    tone: (item.expectedStatus === "bitcoin_confirmed" ? "ok" : "warn") as Tone,
    statusCode: item.expectedStatus,
    authorityEventId: item.authorityEvent.id!,
    proofEventId: item.proofEvent.id!,
    proofContentLength: item.proofEvent.content.length,
    anchorHeight: item.expectedAnchorHeight,
  }));

  return {
    cards,
    provenance: [
      {
        source: "helper",
        title: "Helper-derived facts",
        items: [
          "these rows mirror helper-side verification over real serialized .ots proof bytes",
          "bitcoin_confirmed here still means attestation presence and height, not independent header verification",
          "browser code does not import opentimestamps directly",
        ],
      },
      {
        source: "app",
        title: "App-derived facts",
        items: [
          "this panel is a browser-safe snapshot of the shared real corpus data",
          "it is separate from fixture-scenario protocol resolution above",
          "raw event ids and helper status labels are presentation-only in this workspace",
        ],
      },
    ],
  };
}
