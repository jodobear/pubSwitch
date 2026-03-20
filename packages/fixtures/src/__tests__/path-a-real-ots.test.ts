import { describe, expect, test } from "bun:test";
import { getPathARealOtsCorpus } from "../path-a-real-ots";

describe("Path A real OTS corpus data", () => {
  test("stays deterministic and browser-safe", () => {
    const corpus = getPathARealOtsCorpus();

    expect(
      corpus.map((item) => ({
        id: item.id,
        authorityEventId: item.authorityEvent.id,
        proofEventId: item.proofEvent.id,
        expectedStatus: item.expectedStatus,
        expectedAnchorHeight: item.expectedAnchorHeight,
      })),
    ).toEqual([
      {
        id: "real-pma-pending",
        authorityEventId: "4783e66b79a996eaf8c79a60f6137331eb69ce5115233bd0ef85f423412226a4",
        proofEventId: "73e7668a1bc40507ece7a619d108e253ad3fb067873c8462a4984eca2913aa49",
        expectedStatus: "pending",
        expectedAnchorHeight: undefined,
      },
      {
        id: "real-pma-confirmed",
        authorityEventId: "b8eac2d6d037458c92dafbf9df999b90cfc4629689b6521a17e2340c0529c36c",
        proofEventId: "9284f5458f8ef585c49ff7081b56be4afc27006ca342414ee7589d8e95e27539",
        expectedStatus: "bitcoin_confirmed",
        expectedAnchorHeight: 840_321,
      },
      {
        id: "real-pma-confirmed-duplicate",
        authorityEventId: "827a8c9118fabee89a7a736d0bf79aa975bded7001bb1bdcb533a7571f2daba1",
        proofEventId: "9b08c0eaea5afc839ec43bd7c962e8860049592a79fc8c9db8484a5b15ffa74a",
        expectedStatus: "bitcoin_confirmed",
        expectedAnchorHeight: 840_321,
      },
      {
        id: "real-pma-confirmed-conflict",
        authorityEventId: "c2ec468b1ddfdffb103efa687112773d0ed14d3c347ffaf188b9f5ffaa8fe1a4",
        proofEventId: "cb5091f9e3346922453a379284d8324556015c87b13abd07bd3772fe7f3be7f5",
        expectedStatus: "bitcoin_confirmed",
        expectedAnchorHeight: 840_321,
      },
      {
        id: "real-pmu-confirmed-chain",
        authorityEventId: "69b09a5b2f9c5d4950927d421519a116dfca773a267443e00734499f3f013e81",
        proofEventId: "24175fdebdd5c75952a171e2e757c22df2ca0218a0d63855160ee8b7621ff9dc",
        expectedStatus: "bitcoin_confirmed",
        expectedAnchorHeight: 840_410,
      },
      {
        id: "real-pmu-confirmed-duplicate",
        authorityEventId: "2ff84e2debb80f417e16a64288128b62f5562ebcaeb781a2370986ad410c0087",
        proofEventId: "94f3f1cd65c7fb7fc4467dbb6e131f1e28f98a41abade097df36c00355e9be55",
        expectedStatus: "bitcoin_confirmed",
        expectedAnchorHeight: 840_411,
      },
      {
        id: "real-pmu-confirmed-conflict",
        authorityEventId: "c6a622c5848ff7a8654fa7e5c6da726143f8fdfbb01d9515f791d78dfcd86e66",
        proofEventId: "bf31bfbb1f92e7a36334224353fefef840c70b5d1f00abf8adba660d7c966e9c",
        expectedStatus: "bitcoin_confirmed",
        expectedAnchorHeight: 840_412,
      },
    ]);
    expect(corpus.every((item) => item.authorityEvent.kind === 1776 || item.authorityEvent.kind === 1779)).toBe(true);
    expect(corpus.every((item) => item.proofEvent.kind === 1040)).toBe(true);
  });
});
