import { describe, expect, test } from "bun:test";
import { ProtocolError } from "../errors";
import { canonicalJsonArray } from "../json";

const decoder = new TextDecoder();

describe("canonicalJsonArray", () => {
  test("serializes arrays without whitespace using stable object key ordering", () => {
    const value = [
      "NIP-XX",
      "prepared-migration-update",
      1,
      { z: true, a: "first", nested: { b: 2, a: 1 } },
      ["tail", false, null],
    ];

    const bytes = canonicalJsonArray(value);

    expect(decoder.decode(bytes)).toBe(
      '["NIP-XX","prepared-migration-update",1,{"a":"first","nested":{"a":1,"b":2},"z":true},["tail",false,null]]',
    );
  });

  test("rejects non-array input", () => {
    expect(() => canonicalJsonArray({ nope: true } as unknown[])).toThrow(ProtocolError);
  });

  test("rejects ambiguous values", () => {
    expect(() => canonicalJsonArray(["ok", Number.NaN])).toThrow(
      "canonical JSON does not support non-finite numbers",
    );

    expect(() => canonicalJsonArray(["ok", undefined])).toThrow(
      "canonical JSON does not support undefined",
    );

    const sparse = new Array(2);
    sparse[0] = "present";

    expect(() => canonicalJsonArray(sparse)).toThrow(
      "canonical JSON does not support sparse arrays",
    );

    expect(() => canonicalJsonArray([{ present: true, missing: undefined }])).toThrow(
      "canonical JSON does not support undefined",
    );
  });
});
