import { PMA_KIND, PMU_KIND } from "@tack/protocol-a";
import type { NostrEvent } from "@tack/protocol-shared";
import type { PathAFixtureScenario } from "../../../packages/fixtures/src/index";

export const RECOVERY_BUNDLE_TYPE = "nostr-prepared-migration-bundle";
export const RECOVERY_BUNDLE_ENVELOPE_TYPE = "nostr-prepared-migration-bundle-envelope";
export const RECOVERY_BUNDLE_VERSION = 1;
export const RECOVERY_BUNDLE_DEFAULT_ITERATIONS = 120_000;

export type RecoveryBundlePayload = {
  version: 1;
  type: typeof RECOVERY_BUNDLE_TYPE;
  old_pubkey: string;
  migration_pubkey: string;
  migration_secret: string;
  authority_event: NostrEvent;
  ots_event: NostrEvent;
  relay_hints: string[];
};

export type RecoveryBundleEnvelope = {
  version: 1;
  type: typeof RECOVERY_BUNDLE_ENVELOPE_TYPE;
  kdf: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
    salt_b64: string;
  };
  cipher: {
    name: "AES-GCM";
    iv_b64: string;
  };
  encrypted_bundle_b64: string;
};

export function buildRecoveryBundlePayloadFromPathAScenario(
  input: {
    scenario: PathAFixtureScenario;
    relayHints?: string[];
    migrationSecret?: string;
  },
): RecoveryBundlePayload {
  const authorityEvent = pickBundleAuthorityEvent(input.scenario);
  const otsEvent = pickMatchingOtsEvent(input.scenario, authorityEvent.id);
  const migrationPubkey = extractMigrationPubkey(authorityEvent);

  return {
    version: RECOVERY_BUNDLE_VERSION,
    type: RECOVERY_BUNDLE_TYPE,
    old_pubkey: input.scenario.oldPubkey,
    migration_pubkey: migrationPubkey,
    migration_secret: input.migrationSecret ?? createDemoMigrationSecret(migrationPubkey),
    authority_event: authorityEvent,
    ots_event: otsEvent,
    relay_hints: input.relayHints ?? ["wss://demo-relay.example", "wss://backup-demo-relay.example"],
  };
}

export async function encryptRecoveryBundle(input: {
  bundle: RecoveryBundlePayload;
  passphrase: string;
  iterations?: number;
  salt?: Uint8Array;
  iv?: Uint8Array;
}): Promise<RecoveryBundleEnvelope> {
  if (!input.passphrase.trim()) {
    throw new Error("Recovery bundle passphrase must not be empty");
  }

  const iterations = input.iterations ?? RECOVERY_BUNDLE_DEFAULT_ITERATIONS;
  const salt = input.salt ?? randomBytes(16);
  const iv = input.iv ?? randomBytes(12);
  const encryptionKey = await deriveAesKey({
    passphrase: input.passphrase,
    salt,
    iterations,
    usage: "encrypt",
  });
  const plaintext = utf8Encoder.encode(JSON.stringify(input.bundle));
  const ciphertext = await cryptoOrThrow().subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    encryptionKey,
    toArrayBuffer(plaintext),
  );

  return {
    version: RECOVERY_BUNDLE_VERSION,
    type: RECOVERY_BUNDLE_ENVELOPE_TYPE,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations,
      salt_b64: encodeBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv_b64: encodeBase64(iv),
    },
    encrypted_bundle_b64: encodeBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptRecoveryBundle(input: {
  envelope: RecoveryBundleEnvelope;
  passphrase: string;
}): Promise<RecoveryBundlePayload> {
  if (!input.passphrase.trim()) {
    throw new Error("Recovery bundle passphrase must not be empty");
  }

  const salt = decodeBase64(input.envelope.kdf.salt_b64);
  const iv = decodeBase64(input.envelope.cipher.iv_b64);
  const ciphertext = decodeBase64(input.envelope.encrypted_bundle_b64);
  const encryptionKey = await deriveAesKey({
    passphrase: input.passphrase,
    salt,
    iterations: input.envelope.kdf.iterations,
    usage: "decrypt",
  });
  const plaintext = await cryptoOrThrow().subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    encryptionKey,
    toArrayBuffer(ciphertext),
  );

  return parseRecoveryBundlePayload(utf8Decoder.decode(plaintext));
}

export function serializeRecoveryBundleEnvelope(envelope: RecoveryBundleEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

export function parseRecoveryBundleEnvelope(text: string): RecoveryBundleEnvelope {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Recovery bundle JSON parse failed: ${getErrorMessage(error)}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Recovery bundle envelope must be an object");
  }

  const envelope = parsed as Record<string, unknown>;

  if (envelope.version !== RECOVERY_BUNDLE_VERSION) {
    throw new Error("Recovery bundle envelope version must be 1");
  }

  if (envelope.type !== RECOVERY_BUNDLE_ENVELOPE_TYPE) {
    throw new Error(`Recovery bundle envelope type must be ${RECOVERY_BUNDLE_ENVELOPE_TYPE}`);
  }

  const kdf = envelope.kdf;
  const cipher = envelope.cipher;

  if (!kdf || typeof kdf !== "object") {
    throw new Error("Recovery bundle envelope is missing the kdf section");
  }

  if (!cipher || typeof cipher !== "object") {
    throw new Error("Recovery bundle envelope is missing the cipher section");
  }

  const normalized: RecoveryBundleEnvelope = {
    version: RECOVERY_BUNDLE_VERSION,
    type: RECOVERY_BUNDLE_ENVELOPE_TYPE,
    kdf: {
      name: getRequiredString((kdf as Record<string, unknown>).name, "kdf.name") as "PBKDF2",
      hash: getRequiredString((kdf as Record<string, unknown>).hash, "kdf.hash") as "SHA-256",
      iterations: getRequiredNumber((kdf as Record<string, unknown>).iterations, "kdf.iterations"),
      salt_b64: getRequiredString((kdf as Record<string, unknown>).salt_b64, "kdf.salt_b64"),
    },
    cipher: {
      name: getRequiredString((cipher as Record<string, unknown>).name, "cipher.name") as "AES-GCM",
      iv_b64: getRequiredString((cipher as Record<string, unknown>).iv_b64, "cipher.iv_b64"),
    },
    encrypted_bundle_b64: getRequiredString(
      envelope.encrypted_bundle_b64,
      "encrypted_bundle_b64",
    ),
  };

  if (normalized.kdf.name !== "PBKDF2" || normalized.kdf.hash !== "SHA-256") {
    throw new Error("Recovery bundle envelope must use PBKDF2 with SHA-256");
  }

  if (normalized.cipher.name !== "AES-GCM") {
    throw new Error("Recovery bundle envelope must use AES-GCM");
  }

  return normalized;
}

export function redactRecoveryBundlePayload(bundle: RecoveryBundlePayload): Omit<RecoveryBundlePayload, "migration_secret"> & {
  migration_secret: string;
} {
  return {
    ...bundle,
    migration_secret: "(encrypted on export)",
  };
}

async function deriveAesKey(input: {
  passphrase: string;
  salt: Uint8Array;
  iterations: number;
  usage: "encrypt" | "decrypt";
}): Promise<CryptoKey> {
  const keyMaterial = await cryptoOrThrow().subtle.importKey(
    "raw",
    toArrayBuffer(utf8Encoder.encode(input.passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return cryptoOrThrow().subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(input.salt),
      iterations: input.iterations,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    [input.usage],
  );
}

function parseRecoveryBundlePayload(text: string): RecoveryBundlePayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Recovery bundle payload parse failed: ${getErrorMessage(error)}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Recovery bundle payload must be an object");
  }

  const bundle = parsed as Record<string, unknown>;
  const authorityEvent = bundle.authority_event;
  const otsEvent = bundle.ots_event;
  const relayHints = bundle.relay_hints;

  if (!authorityEvent || typeof authorityEvent !== "object") {
    throw new Error("Recovery bundle payload is missing authority_event");
  }

  if (!otsEvent || typeof otsEvent !== "object") {
    throw new Error("Recovery bundle payload is missing ots_event");
  }

  if (!Array.isArray(relayHints) || relayHints.some((hint) => typeof hint !== "string")) {
    throw new Error("Recovery bundle payload relay_hints must be a string array");
  }

  return {
    version: RECOVERY_BUNDLE_VERSION,
    type: getRequiredString(bundle.type, "type") as typeof RECOVERY_BUNDLE_TYPE,
    old_pubkey: getRequiredString(bundle.old_pubkey, "old_pubkey"),
    migration_pubkey: getRequiredString(bundle.migration_pubkey, "migration_pubkey"),
    migration_secret: getRequiredString(bundle.migration_secret, "migration_secret"),
    authority_event: authorityEvent as NostrEvent,
    ots_event: otsEvent as NostrEvent,
    relay_hints: relayHints,
  };
}

function pickBundleAuthorityEvent(scenario: PathAFixtureScenario): NostrEvent {
  const authorityId =
    "authorityId" in scenario.expectedState ? scenario.expectedState.authorityId : undefined;

  if (authorityId) {
    const matchingAuthority = scenario.events.find((event) => event.id === authorityId);
    if (matchingAuthority) {
      return matchingAuthority;
    }
  }

  const pmuEvents = scenario.events.filter((event) => event.kind === PMU_KIND);
  if (pmuEvents.length > 0) {
    return [...pmuEvents].sort((left, right) => right.created_at - left.created_at)[0]!;
  }

  const pmaEvent = scenario.events.find((event) => event.kind === PMA_KIND);
  if (!pmaEvent) {
    throw new Error(`Scenario ${scenario.id} does not contain a PMA or PMU authority event`);
  }

  return pmaEvent;
}

function pickMatchingOtsEvent(scenario: PathAFixtureScenario, authorityId?: string): NostrEvent {
  if (authorityId) {
    const matchingProof = scenario.otsProofs.find((event) => getTagValue(event, "e") === authorityId);
    if (matchingProof) {
      return matchingProof;
    }
  }

  if (scenario.otsProofs.length === 0) {
    throw new Error(`Scenario ${scenario.id} does not contain a matching OTS event`);
  }

  return scenario.otsProofs[0]!;
}

function extractMigrationPubkey(authorityEvent: NostrEvent): string {
  const migrationPubkey =
    authorityEvent.kind === PMA_KIND ? getTagValue(authorityEvent, "m") : getTagValue(authorityEvent, "u");

  if (!migrationPubkey) {
    throw new Error(`Authority event ${authorityEvent.id ?? "(unknown)"} is missing its migration pubkey tag`);
  }

  return migrationPubkey;
}

function createDemoMigrationSecret(migrationPubkey: string): string {
  return `nsec-demo-${migrationPubkey}`;
}

function getTagValue(event: NostrEvent, name: string): string | undefined {
  const tag = event.tags.find((candidate) => candidate[0] === name);
  return tag?.[1];
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  cryptoOrThrow().getRandomValues(bytes);
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function getRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
}

function getRequiredNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`);
  }

  return value;
}

function cryptoOrThrow(): Crypto {
  if (!globalThis.crypto) {
    throw new Error("Web Crypto is not available in this environment");
  }

  return globalThis.crypto;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();
