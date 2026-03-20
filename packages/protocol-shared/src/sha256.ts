import { sha256 as nobleSha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "./hex";

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return new Uint8Array(digest);
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return bytesToHex(await sha256(bytes));
}

export function sha256Sync(bytes: Uint8Array): Uint8Array {
  return nobleSha256(bytes);
}

export function sha256HexSync(bytes: Uint8Array): string {
  return bytesToHex(sha256Sync(bytes));
}
