import { describe, expect, test } from "bun:test";
import { ProtocolError } from "../errors";
import { assertLowercaseHex32, bytesToHex, hexToBytes } from "../hex";

describe("hex helpers", () => {
  test("round-trip lowercase hex bytes", () => {
    const bytes = hexToBytes("0011aaff");

    expect(Array.from(bytes)).toEqual([0x00, 0x11, 0xaa, 0xff]);
    expect(bytesToHex(bytes)).toBe("0011aaff");
  });

  test("validates 32-byte lowercase hex inputs", () => {
    expect(() =>
      assertLowercaseHex32(
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "pubkey",
      ),
    ).not.toThrow();

    expect(() =>
      assertLowercaseHex32(
        "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
        "pubkey",
      ),
    ).toThrow("pubkey must be lowercase hex");
  });

  test("rejects malformed hex", () => {
    expect(() => hexToBytes("abc")).toThrow("hex input must have even length");
    expect(() => hexToBytes("00GG")).toThrow("hex input must be lowercase hex");
    expect(() => assertLowercaseHex32("abcd", "pubkey")).toThrow(ProtocolError);
  });
});
