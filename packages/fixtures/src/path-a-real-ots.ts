import { type NostrEvent } from "../../protocol-shared/src/index";

export type PathARealOtsCorpusItem = {
  id: string;
  title: string;
  note: string;
  authorityEvent: NostrEvent;
  authorityPreimage: string;
  proofEvent: NostrEvent;
  expectedStatus: "pending" | "bitcoin_confirmed";
  expectedAnchorHeight?: number;
};

const REAL_PATH_A_OTS_CORPUS: PathARealOtsCorpusItem[] = [
  {
    id: "real-pma-pending",
    title: "Real PMA pending proof",
    note: "A real PMA event bound to locally serialized pending OpenTimestamps proof bytes.",
    authorityEvent: {
      pubkey: "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      created_at: 1_700_200_000,
      kind: 1776,
      tags: [
        ["o", "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],
        ["m", "c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"],
        ["alt", "Prepared Migration Authority"],
      ],
      content: "",
      id: "4783e66b79a996eaf8c79a60f6137331eb69ce5115233bd0ef85f423412226a4",
      sig: "a51315c08f34444908133548c2cdbdd94d0956437a7b084198fdafaa669e0394a5668f587741d177ebdaf14a4e575385c3dbe4b0dd48d48ed2e5d987f6e2c214",
    },
    authorityPreimage:
      '[0,"79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",1700200000,1776,[["o","79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],["m","c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"],["alt","Prepared Migration Authority"]],""]',
    proofEvent: {
      pubkey: "774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb",
      created_at: 1_700_200_060,
      kind: 1040,
      tags: [
        ["e", "4783e66b79a996eaf8c79a60f6137331eb69ce5115233bd0ef85f423412226a4"],
        ["k", "1776"],
      ],
      content:
        "AE9wZW5UaW1lc3RhbXBzAABQcm9vZgC/ieLohOiSlAEIR4Pma3mplur4x5pg9hNzMetpzlEVIzvQ74X0I0EiJqQAg9/jDS75DI4uLWh0dHBzOi8vYWxpY2UuYnRjLmNhbGVuZGFyLm9wZW50aW1lc3RhbXBzLm9yZw==",
      id: "73e7668a1bc40507ece7a619d108e253ad3fb067873c8462a4984eca2913aa49",
      sig: "e7d79ac0126713e1bd430990d1226b2845e88e46d25bfcab9e12f572686eed49dff0f9eef9936f8d4b270a9551748950f5489eea2a03e6710056ff0d9de34a9b",
    },
    expectedStatus: "pending",
  },
  {
    id: "real-pma-confirmed",
    title: "Real PMA Bitcoin-attested proof",
    note: "A real PMA event bound to locally serialized OpenTimestamps bytes with a Bitcoin block-header attestation.",
    authorityEvent: {
      pubkey: "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      created_at: 1_700_200_120,
      kind: 1776,
      tags: [
        ["o", "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],
        ["m", "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9"],
        ["alt", "Prepared Migration Authority"],
      ],
      content: "",
      id: "b8eac2d6d037458c92dafbf9df999b90cfc4629689b6521a17e2340c0529c36c",
      sig: "76700dc6f5fc65712fa7b682ffb70f0b27079f0bb9ec5df222027662e51986248b53f48b99f3eaf60027b3eb36283090656776cac7a0d7ac004e9d779c9da32c",
    },
    authorityPreimage:
      '[0,"79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",1700200120,1776,[["o","79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],["m","f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9"],["alt","Prepared Migration Authority"]],""]',
    proofEvent: {
      pubkey: "774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb",
      created_at: 1_700_200_180,
      kind: 1040,
      tags: [
        ["e", "b8eac2d6d037458c92dafbf9df999b90cfc4629689b6521a17e2340c0529c36c"],
        ["k", "1776"],
      ],
      content: "AE9wZW5UaW1lc3RhbXBzAABQcm9vZgC/ieLohOiSlAEIuOrC1tA3RYyS2vv535mbkM/EYpaJtlIaF+I0DAUpw2wABYiWDXPXGQEDgaUz",
      id: "9284f5458f8ef585c49ff7081b56be4afc27006ca342414ee7589d8e95e27539",
      sig: "760a9fc75b0a22a5d292eaff7ce1ad610755b4dc7603954f1d5080ec227665acbdb5c71be1157502d1bf71d0f0a86c177e90972833b86e9aa73e96dbe48a2bc2",
    },
    expectedStatus: "bitcoin_confirmed",
    expectedAnchorHeight: 840_321,
  },
  {
    id: "real-pma-confirmed-duplicate",
    title: "Real duplicate confirmed PMA root",
    note: "A second real confirmed PMA root with the same semantic migration target, used to exercise duplicate-root collapse with real proof bytes.",
    authorityEvent: {
      pubkey: "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      created_at: 1_700_200_180,
      kind: 1776,
      tags: [
        ["o", "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],
        ["m", "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9"],
        ["alt", "Prepared Migration Authority"],
      ],
      content: "",
      id: "827a8c9118fabee89a7a736d0bf79aa975bded7001bb1bdcb533a7571f2daba1",
      sig: "9bed70f3a53f9112fa0518132ad6a6601cd1058851a41a2a5605f4f14efc8103eff92a57a1bd9ff0f9daa80e590481f94287d290d342bc994bcae1c234592e44",
    },
    authorityPreimage:
      '[0,"79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",1700200180,1776,[["o","79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],["m","f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9"],["alt","Prepared Migration Authority"]],""]',
    proofEvent: {
      pubkey: "774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb",
      created_at: 1_700_200_240,
      kind: 1040,
      tags: [
        ["e", "827a8c9118fabee89a7a736d0bf79aa975bded7001bb1bdcb533a7571f2daba1"],
        ["k", "1776"],
      ],
      content: "AE9wZW5UaW1lc3RhbXBzAABQcm9vZgC/ieLohOiSlAEIgnqMkRj6vuiaenNtC/eaqXW97XABuxvctTOnVx8tq6EABYiWDXPXGQEDgaUz",
      id: "9b08c0eaea5afc839ec43bd7c962e8860049592a79fc8c9db8484a5b15ffa74a",
      sig: "d238ff74a068de99fb54116a2d4b2a39c0c1d6f135e003600163b90fd5269ee14fbe94fc65e2629f8d0bf2ec61e2cc2ffff52bce0892b1c6b6e8395cd9a678ff",
    },
    expectedStatus: "bitcoin_confirmed",
    expectedAnchorHeight: 840_321,
  },
  {
    id: "real-pma-confirmed-conflict",
    title: "Real conflicting confirmed PMA root",
    note: "A second real confirmed PMA root with a different migration key, used for the plural root-conflict demo.",
    authorityEvent: {
      pubkey: "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      created_at: 1_700_200_240,
      kind: 1776,
      tags: [
        ["o", "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],
        ["m", "e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13"],
        ["alt", "Prepared Migration Authority"],
      ],
      content: "",
      id: "c2ec468b1ddfdffb103efa687112773d0ed14d3c347ffaf188b9f5ffaa8fe1a4",
      sig: "1b08e75b5b558f4abd82523b4f0f53325d68fca9d696979e07490c3d6b6a600fbf99573b0c2b206a0a7f54175bf372c973313cf70eea52ececa7e7bdf22d1bb9",
    },
    authorityPreimage:
      '[0,"79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",1700200240,1776,[["o","79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],["m","e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13"],["alt","Prepared Migration Authority"]],""]',
    proofEvent: {
      pubkey: "774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb",
      created_at: 1_700_200_300,
      kind: 1040,
      tags: [
        ["e", "c2ec468b1ddfdffb103efa687112773d0ed14d3c347ffaf188b9f5ffaa8fe1a4"],
        ["k", "1776"],
      ],
      content: "AE9wZW5UaW1lc3RhbXBzAABQcm9vZgC/ieLohOiSlAEIwuxGix3f3/sQPvpocRJ3PQ7RTTw0f/rxiLn1/6qP4aQABYiWDXPXGQEDgaUz",
      id: "cb5091f9e3346922453a379284d8324556015c87b13abd07bd3772fe7f3be7f5",
      sig: "b122577612a938c050825780eb954d6e3e7350de7f0ae7a270319ddb5bf5d37cd62e36793f71c06b155aad7a73dfa11b61d67bbadff811f7c13ef737d2ef0341",
    },
    expectedStatus: "bitcoin_confirmed",
    expectedAnchorHeight: 840_321,
  },
  {
    id: "real-pmu-confirmed-chain",
    title: "Real confirmed PMU chain authority",
    note: "A real confirmed PMU child under the shared confirmed PMA root, used for the main authority-chain demo scenarios.",
    authorityEvent: {
      pubkey: "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",
      created_at: 1_700_200_300,
      kind: 1779,
      tags: [
        ["o", "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],
        ["e", "b8eac2d6d037458c92dafbf9df999b90cfc4629689b6521a17e2340c0529c36c"],
        ["u", "c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"],
        [
          "os",
          "cb342d065ed2759c57b3914ecc43c158a22f80da606f4fd26dfca8208073dd5cfc8da30994c9f5cf7cc521419cd4654daefab113002bbdc430fe1499812081ae",
        ],
        [
          "ns",
          "6760edec6923a92b23f72e0949b1269e319133c23684a936ad93bc48c2540dcdf12632f0d7e4a535eee4a2184d2b06881ea5deee8e829d8df2e8d257484eb8b3",
        ],
        ["alt", "Prepared Migration Authority Update"],
      ],
      content: "",
      id: "69b09a5b2f9c5d4950927d421519a116dfca773a267443e00734499f3f013e81",
      sig: "03ac2b0c4f39c134d9e4aadc5a712eac521ea389d853a7d30c0fcaed89ec63a965529bbc272faf06226100f75f7c708c5a872db9332752ee8dfd2f4e93b73da1",
    },
    authorityPreimage:
      '[0,"f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",1700200300,1779,[["o","79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],["e","b8eac2d6d037458c92dafbf9df999b90cfc4629689b6521a17e2340c0529c36c"],["u","c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"],["os","cb342d065ed2759c57b3914ecc43c158a22f80da606f4fd26dfca8208073dd5cfc8da30994c9f5cf7cc521419cd4654daefab113002bbdc430fe1499812081ae"],["ns","6760edec6923a92b23f72e0949b1269e319133c23684a936ad93bc48c2540dcdf12632f0d7e4a535eee4a2184d2b06881ea5deee8e829d8df2e8d257484eb8b3"],["alt","Prepared Migration Authority Update"]],""]',
    proofEvent: {
      pubkey: "774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb",
      created_at: 1_700_200_360,
      kind: 1040,
      tags: [
        ["e", "69b09a5b2f9c5d4950927d421519a116dfca773a267443e00734499f3f013e81"],
        ["k", "1779"],
      ],
      content: "AE9wZW5UaW1lc3RhbXBzAABQcm9vZgC/ieLohOiSlAEIabCaWy+cXUlQkn1CFRmhFt/KdzomdEPgBzRJnz8BPoEABYiWDXPXGQED2qUz",
      id: "24175fdebdd5c75952a171e2e757c22df2ca0218a0d63855160ee8b7621ff9dc",
      sig: "83855e21243c6d426d917528d1b726af9083ade3e8ca2de1ff72a19d75c2491e836c52551aaeac7f2c939cb6f7c46261985ccb3d0e93e351f4b5a6ed21dc7053",
    },
    expectedStatus: "bitcoin_confirmed",
    expectedAnchorHeight: 840_410,
  },
  {
    id: "real-pmu-confirmed-duplicate",
    title: "Real duplicate confirmed PMU child",
    note: "A second real confirmed PMU child under the duplicate PMA root, used to exercise duplicate-child collapse with real proof bytes.",
    authorityEvent: {
      pubkey: "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",
      created_at: 1_700_200_360,
      kind: 1779,
      tags: [
        ["o", "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],
        ["e", "827a8c9118fabee89a7a736d0bf79aa975bded7001bb1bdcb533a7571f2daba1"],
        ["u", "c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"],
        [
          "os",
          "9609ccc1283fd041ab8338ce085b46626ed6f6776f3df882cdb19044c44a9a7c4934559d4123fca3b8fdfbaaff8b705f9e41de835111acd2c5f2d5eb44010da3",
        ],
        [
          "ns",
          "6129f9f76f293cfa3fb03aab61824e2249322770b9a9de893d535760598813c06bb7b50fc96e62a6e99dc1eecb5437d250105ef56865172df4889fd8dc4bb36e",
        ],
        ["alt", "Prepared Migration Authority Update"],
      ],
      content: "",
      id: "2ff84e2debb80f417e16a64288128b62f5562ebcaeb781a2370986ad410c0087",
      sig: "0c929cd6dd90b86f5f3eef43510b1fdbb4cb913fa5464f4e4fbd8d16fd7d3d24f1061e18c086db00c187189463aa903fdb45999bcba102525e760e4c573d3071",
    },
    authorityPreimage:
      '[0,"f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",1700200360,1779,[["o","79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],["e","827a8c9118fabee89a7a736d0bf79aa975bded7001bb1bdcb533a7571f2daba1"],["u","c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5"],["os","9609ccc1283fd041ab8338ce085b46626ed6f6776f3df882cdb19044c44a9a7c4934559d4123fca3b8fdfbaaff8b705f9e41de835111acd2c5f2d5eb44010da3"],["ns","6129f9f76f293cfa3fb03aab61824e2249322770b9a9de893d535760598813c06bb7b50fc96e62a6e99dc1eecb5437d250105ef56865172df4889fd8dc4bb36e"],["alt","Prepared Migration Authority Update"]],""]',
    proofEvent: {
      pubkey: "774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb",
      created_at: 1_700_200_420,
      kind: 1040,
      tags: [
        ["e", "2ff84e2debb80f417e16a64288128b62f5562ebcaeb781a2370986ad410c0087"],
        ["k", "1779"],
      ],
      content: "AE9wZW5UaW1lc3RhbXBzAABQcm9vZgC/ieLohOiSlAEIL/hOLeu4D0F+FqZCiBKLYvVWLryut4GiNwmGrUEMAIcABYiWDXPXGQED26Uz",
      id: "94f3f1cd65c7fb7fc4467dbb6e131f1e28f98a41abade097df36c00355e9be55",
      sig: "fc19088a825d7ee789ec15991779a1fdb7e43bc1a72ac2b805cfb7cb837e26cca1b1bc45653af5976a4660579e39da0ce40924146079b3adcfc15d5e3fc66bf2",
    },
    expectedStatus: "bitcoin_confirmed",
    expectedAnchorHeight: 840_411,
  },
  {
    id: "real-pmu-confirmed-conflict",
    title: "Real conflicting confirmed PMU child",
    note: "A real confirmed PMU child that diverges to a different next migration key, used for plural child-conflict demos.",
    authorityEvent: {
      pubkey: "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",
      created_at: 1_700_200_420,
      kind: 1779,
      tags: [
        ["o", "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],
        ["e", "b8eac2d6d037458c92dafbf9df999b90cfc4629689b6521a17e2340c0529c36c"],
        ["u", "e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13"],
        [
          "os",
          "057c829be2f514e6a05695b29dc4b7d4fbcb4f7733eedd3155e15462cfd355210aa4fbe0c657e506a27d92dfd86c823dc6bb3b0ae5dc2b78dbacc774b6cad355",
        ],
        [
          "ns",
          "40aa497a922890ae010cdc2d5d225aefc6ac6ed78751d49ac81f4e4e5072e5fe14d5602e28da0109312840498ed462da3b9f0b33bfccb24ec307e0c5bf40ccc1",
        ],
        ["alt", "Prepared Migration Authority Update"],
      ],
      content: "",
      id: "c6a622c5848ff7a8654fa7e5c6da726143f8fdfbb01d9515f791d78dfcd86e66",
      sig: "76f122f54bc39ba43b3a1bf79f31c52056963b3df3dfe20cc3ede90d2e7ee7eab767939d407fdd72fd1f0dd14e6bc0c0d52ba9f6cd19d0eba6b5888c5b339cd2",
    },
    authorityPreimage:
      '[0,"f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",1700200420,1779,[["o","79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],["e","b8eac2d6d037458c92dafbf9df999b90cfc4629689b6521a17e2340c0529c36c"],["u","e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13"],["os","057c829be2f514e6a05695b29dc4b7d4fbcb4f7733eedd3155e15462cfd355210aa4fbe0c657e506a27d92dfd86c823dc6bb3b0ae5dc2b78dbacc774b6cad355"],["ns","40aa497a922890ae010cdc2d5d225aefc6ac6ed78751d49ac81f4e4e5072e5fe14d5602e28da0109312840498ed462da3b9f0b33bfccb24ec307e0c5bf40ccc1"],["alt","Prepared Migration Authority Update"]],""]',
    proofEvent: {
      pubkey: "774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb",
      created_at: 1_700_200_480,
      kind: 1040,
      tags: [
        ["e", "c6a622c5848ff7a8654fa7e5c6da726143f8fdfbb01d9515f791d78dfcd86e66"],
        ["k", "1779"],
      ],
      content: "AE9wZW5UaW1lc3RhbXBzAABQcm9vZgC/ieLohOiSlAEIxqYixYSP96hlT6flxtpyYUP4/fuwHZUV95HXjfzYbmYABYiWDXPXGQED3KUz",
      id: "bf31bfbb1f92e7a36334224353fefef840c70b5d1f00abf8adba660d7c966e9c",
      sig: "0d663ba6505e8bf6c645c9aee6b3612d114c4ea20d24198bbf867f531a2937ea4f76d5aaa06552bf1e3a84b4b446e5d481ace0bd073443043c64501da67ee5aa",
    },
    expectedStatus: "bitcoin_confirmed",
    expectedAnchorHeight: 840_412,
  },
];

export function getPathARealOtsCorpus(): PathARealOtsCorpusItem[] {
  return REAL_PATH_A_OTS_CORPUS.map((item) => cloneCorpusItem(item));
}

export function getPathARealOtsCorpusItem(id: string): PathARealOtsCorpusItem | undefined {
  return getPathARealOtsCorpus().find((item) => item.id === id);
}

function cloneCorpusItem(item: PathARealOtsCorpusItem): PathARealOtsCorpusItem {
  return {
    ...item,
    authorityEvent: cloneEvent(item.authorityEvent),
    proofEvent: cloneEvent(item.proofEvent),
  };
}

function cloneEvent(event: NostrEvent): NostrEvent {
  return {
    ...event,
    tags: event.tags.map((tag) => [...tag]),
  };
}
