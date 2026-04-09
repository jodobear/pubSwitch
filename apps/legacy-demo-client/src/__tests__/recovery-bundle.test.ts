import { describe, expect, test } from "bun:test";
import { getPathAFixtureScenario } from "../../../../packages/fixtures/src/index";
import {
  buildRecoveryBundlePayloadFromPathAScenario,
  decryptRecoveryBundle,
  encryptRecoveryBundle,
  parseRecoveryBundleEnvelope,
  serializeRecoveryBundleEnvelope,
} from "../recovery-bundle";

describe("recovery bundle", () => {
  test("builds a payload from the active Path A authority and round-trips deterministically", async () => {
    const scenario = await getPathAFixtureScenario("confirmed-authority");
    expect(scenario).toBeDefined();

    const payload = buildRecoveryBundlePayloadFromPathAScenario({
      scenario: scenario!,
      relayHints: ["wss://demo-relay.example"],
    });
    const expectedMigrationPubkey =
      payload.authority_event.tags.find((tag) => tag[0] === "u")?.[1] ??
      payload.authority_event.tags.find((tag) => tag[0] === "m")?.[1];

    expect(payload.migration_pubkey).toBe(expectedMigrationPubkey);
    expect(payload.authority_event.id).toBe(scenario!.expectedState.authorityId);
    expect(payload.ots_event.kind).toBe(1040);

    const salt = new Uint8Array(Array.from({ length: 16 }, (_, index) => index + 1));
    const iv = new Uint8Array(Array.from({ length: 12 }, (_, index) => index + 101));

    const envelopeA = await encryptRecoveryBundle({
      bundle: payload,
      passphrase: "demo-passphrase",
      iterations: 10_000,
      salt,
      iv,
    });
    const envelopeB = await encryptRecoveryBundle({
      bundle: payload,
      passphrase: "demo-passphrase",
      iterations: 10_000,
      salt,
      iv,
    });

    expect(envelopeA).toEqual(envelopeB);

    const serialized = serializeRecoveryBundleEnvelope(envelopeA);
    const parsed = parseRecoveryBundleEnvelope(serialized);
    const restored = await decryptRecoveryBundle({
      envelope: parsed,
      passphrase: "demo-passphrase",
    });

    expect(restored).toEqual(payload);
  });

  test("rejects decryption with the wrong passphrase", async () => {
    const scenario = await getPathAFixtureScenario("pending-ots");
    expect(scenario).toBeDefined();

    const payload = buildRecoveryBundlePayloadFromPathAScenario({
      scenario: scenario!,
    });
    const envelope = await encryptRecoveryBundle({
      bundle: payload,
      passphrase: "right-passphrase",
      iterations: 8_000,
      salt: new Uint8Array(16),
      iv: new Uint8Array(12),
    });

    await expect(
      decryptRecoveryBundle({
        envelope,
        passphrase: "wrong-passphrase",
      }),
    ).rejects.toThrow();
  });
});
