import { assertLowercaseHex32, hexToBytes } from "./hex";
import { sha256Hex } from "./sha256";
import { utf8 } from "./json";

const TRANSITION_PREFIX = "nostr-social-transition:v1";

export async function computeTransitionId(
  oldPubkey: string,
  newPubkey: string,
): Promise<string> {
  assertLowercaseHex32(oldPubkey, "oldPubkey");
  assertLowercaseHex32(newPubkey, "newPubkey");

  const oldBytes = hexToBytes(oldPubkey);
  const newBytes = hexToBytes(newPubkey);
  const prefix = utf8(TRANSITION_PREFIX);

  const payload = new Uint8Array(prefix.length + oldBytes.length + newBytes.length + 2);
  let offset = 0;

  payload.set(prefix, offset);
  offset += prefix.length;
  payload[offset] = 0;
  offset += 1;
  payload.set(oldBytes, offset);
  offset += oldBytes.length;
  payload[offset] = 0;
  offset += 1;
  payload.set(newBytes, offset);

  return sha256Hex(payload);
}

