import { type NostrEvent } from "../../../packages/protocol-shared/src/index";

export type OtsDemoVector = {
  id: string;
  title: string;
  note: string;
  targetEventId: string;
  expectedStatus: "pending" | "bitcoin_confirmed";
  expectedAnchorHeight?: number;
  proofEvent: NostrEvent;
};

// Sourced from the OpenTimestamps javascript-opentimestamps example corpus and
// vendored here as deterministic PoC vectors for local helper verification.
const COMPLETE_PROOF_BASE64 =
  "AE9wZW5UaW1lc3RhbXBzAABQcm9vZgC/ieLohOiSlAEIA7ogTlDRJuRnTABeBNguhMITZngK8fQ71Uo3gWtqs0AD8cgBAQAAAAHkgvnTLsw7ple2nYmAEIV7VEV6kEl5gv9W+XxOxY5vmAEAAABrSDBFAiEAslOt0dHPkIRDOKR1oE/xP8nnvSQrB3Yt6gf1YIst42cCIACyaMqcM0KzdpzdBiiRMXzc74eqwxC2hV6dk4mOu+jsASECDY5NEH0rM5sAUO/dS0oJJFqgVgSPElOWN06moqsHCcb/////AmUz5gUAAAAAGXapFAvwV9QPu6Z0SGJRX1tVojEN5XcviKyghgEAAAAAABl2qRTwBoisAAAAAAgI8SCph/cWxTORPDFMeONdNYhMrJQ/pCysSdKyxp9AA/hfiAgI8SDexVs0h+Hj9yKkm1WneDIVhieF9KOss5KEYBn3HcZKnQgI8SCyyhj0heCAR44CXas9RktBbA4ey2Ypya786MghTQQkMggI8CARsOkGYRlv9LCBPD7aFBurXpFgSDe996DJ3zfbDjoRmAgI8CDDS8GkoQk//RSMAWseZkdCkU6Tnvq+TT01ZRWRSybZ4ggI8CDD5ufDjGn2ryTCvjTrrEglft5h7AohuVNeREMne+MGRggI8SAHmL+GBuAAJOXV1UvwyWD2Kd+52taRV0VbbyZSwOjegQgI8CA/mtptYLqiRABrsKrVFEitL6+51LZIegmZz/JrkfD1NggI8SDHAwGelZqN0/rvdIm7MoukhVdHWOcJHwFGTrZYcsl1yAgI8CDL/v/1E/+EuRXj/tb515lnZjD4Nk6ipsdVf62UpbXXiAgI8SAL4jcJhZkTur1EYLvd+O0hPnyHc6Sx+s4w+Kz98JO3BQgIAAWIlg1z1xkBA/fvFQ==";
const PENDING_PROOF_BASE64 =
  "AE9wZW5UaW1lc3RhbXBzAABQcm9vZgC/ieLohOiSlAEIBcT2FqjlMQ0Z2TjP12mGTX9MzcLKi0ebEK+DVksJevnwEOdUv5OAan66poDve9ARS/QI8BC1c+iFDP2eY9HwQ/u2/CUOCPEEV8+lxPAIb7GsjU5OsOcAg9/jDS75DI4uLWh0dHBzOi8vYWxpY2UuYnRjLmNhbGVuZGFyLm9wZW50aW1lc3RhbXBzLm9yZw==";

const DEMO_VECTORS: OtsDemoVector[] = [
  {
    id: "sample-bitcoin-confirmed",
    title: "Sample Bitcoin-confirmed OTS proof",
    note: "OpenTimestamps hello-world example with one Bitcoin block-header attestation.",
    targetEventId: "03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340",
    expectedStatus: "bitcoin_confirmed",
    expectedAnchorHeight: 358_391,
    proofEvent: {
      id: "abababababababababababababababababababababababababababababababab",
      pubkey: "1".repeat(64),
      created_at: 1_762_000_000,
      kind: 1040,
      tags: [
        ["e", "03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340"],
        ["k", "1776"],
      ],
      content: COMPLETE_PROOF_BASE64,
      sig: "2".repeat(128),
    },
  },
  {
    id: "sample-pending",
    title: "Sample pending OTS proof",
    note: "OpenTimestamps incomplete example with only a pending calendar attestation.",
    targetEventId: "05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9",
    expectedStatus: "pending",
    proofEvent: {
      id: "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
      pubkey: "3".repeat(64),
      created_at: 1_762_000_060,
      kind: 1040,
      tags: [
        ["e", "05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9"],
        ["k", "1776"],
      ],
      content: PENDING_PROOF_BASE64,
      sig: "4".repeat(128),
    },
  },
];

export function getOtsDemoVectors(): OtsDemoVector[] {
  return DEMO_VECTORS.map((vector) => ({
    ...vector,
    proofEvent: {
      ...vector.proofEvent,
      tags: vector.proofEvent.tags.map((tag) => [...tag]),
    },
  }));
}

export function getOtsDemoVector(id: string): OtsDemoVector | undefined {
  return getOtsDemoVectors().find((vector) => vector.id === id);
}
