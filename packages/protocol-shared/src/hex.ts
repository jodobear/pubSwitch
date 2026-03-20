import { ProtocolError } from "./errors";

const HEX_32_LENGTH = 64;
const LOWERCASE_HEX_PATTERN = /^[0-9a-f]+$/;

export function assertLowercaseHex32(value: string, label: string): void {
  if (value.length !== HEX_32_LENGTH) {
    throw new ProtocolError(`${label} must be 32-byte lowercase hex`);
  }

  if (!LOWERCASE_HEX_PATTERN.test(value)) {
    throw new ProtocolError(`${label} must be lowercase hex`);
  }
}

export function hexToBytes(value: string): Uint8Array {
  if (value.length % 2 !== 0) {
    throw new ProtocolError("hex input must have even length");
  }

  if (!LOWERCASE_HEX_PATTERN.test(value)) {
    throw new ProtocolError("hex input must be lowercase hex");
  }

  const output = new Uint8Array(value.length / 2);

  for (let index = 0; index < output.length; index += 1) {
    const start = index * 2;
    output[index] = Number.parseInt(value.slice(start, start + 2), 16);
  }

  return output;
}

export function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

