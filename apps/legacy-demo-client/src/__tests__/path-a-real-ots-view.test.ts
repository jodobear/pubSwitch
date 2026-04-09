import { describe, expect, test } from "bun:test";
import { buildPathARealOtsViewModel } from "../path-a-real-ots-view";

describe("Path A real OTS view model", () => {
  test("surfaces the shared real corpus as a browser-safe snapshot", () => {
    const view = buildPathARealOtsViewModel();

    expect(view.cards).toHaveLength(7);
    expect(view.cards.map((card) => card.id)).toEqual([
      "real-pma-pending",
      "real-pma-confirmed",
      "real-pma-confirmed-duplicate",
      "real-pma-confirmed-conflict",
      "real-pmu-confirmed-chain",
      "real-pmu-confirmed-duplicate",
      "real-pmu-confirmed-conflict",
    ]);

    expect(view.cards[0]).toEqual({
      id: "real-pma-pending",
      title: "Real PMA pending proof",
      note: "A real PMA event bound to locally serialized pending OpenTimestamps proof bytes.",
      tone: "warn",
      statusCode: "pending",
      authorityEventId: "4783e66b79a996eaf8c79a60f6137331eb69ce5115233bd0ef85f423412226a4",
      proofEventId: "73e7668a1bc40507ece7a619d108e253ad3fb067873c8462a4984eca2913aa49",
      proofContentLength: 164,
      anchorHeight: undefined,
    });

    expect(view.cards[4]).toEqual({
      id: "real-pmu-confirmed-chain",
      title: "Real confirmed PMU chain authority",
      note: "A real confirmed PMU child under the shared confirmed PMA root, used for the main authority-chain demo scenarios.",
      tone: "ok",
      statusCode: "bitcoin_confirmed",
      authorityEventId: "69b09a5b2f9c5d4950927d421519a116dfca773a267443e00734499f3f013e81",
      proofEventId: "24175fdebdd5c75952a171e2e757c22df2ca0218a0d63855160ee8b7621ff9dc",
      proofContentLength: 104,
      anchorHeight: 840_410,
    });

    expect(view.provenance.find((card) => card.source === "helper")?.items).toContain(
      "browser code does not import opentimestamps directly",
    );
  });
});
