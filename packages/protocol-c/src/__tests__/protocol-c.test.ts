import { describe, expect, test } from "bun:test";
import {
  deriveSchnorrPublicKey,
  signNostrEventWithSecretKey,
  type UnsignedNostrEvent,
} from "@tack/protocol-shared";
import {
  buildSocialAttestation,
  buildSocialClaim,
  resolveSocialTransition,
  validateSocialAttestation,
  validateSocialClaim,
  type SignerLike,
} from "../index";

const OLD_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000007";
const NEW_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000008";
const ATTESTOR_A_SECRET_KEY = "0000000000000000000000000000000000000000000000000000000000000009";
const ATTESTOR_B_SECRET_KEY = "000000000000000000000000000000000000000000000000000000000000000a";
const OLD_PUBKEY = deriveSchnorrPublicKey(OLD_SECRET_KEY);
const NEW_PUBKEY = deriveSchnorrPublicKey(NEW_SECRET_KEY);
const ATTESTOR_A = deriveSchnorrPublicKey(ATTESTOR_A_SECRET_KEY);
const ATTESTOR_B = deriveSchnorrPublicKey(ATTESTOR_B_SECRET_KEY);

describe("buildSocialClaim", () => {
  test("builds an old-role claim with computed transition id", async () => {
    const event = await buildSocialClaim({
      role: "old",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      signer: createFakeSigner(OLD_PUBKEY),
      content: "rotated keys",
      createdAt: 1_700_100_000,
    });

    expect(event.kind).toBe(1778);
    expect(event.pubkey).toBe(OLD_PUBKEY);
    expect(event.content).toBe("rotated keys");
    expect(event.tags.map((tag) => tag[0])).toEqual(["d", "o", "n", "alt"]);
  });
});

describe("buildSocialAttestation", () => {
  test("builds a support attestation with optional method and claim refs", async () => {
    const event = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_A),
      stance: "support",
      method: "video",
      referencedClaimIds: [
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ],
      createdAt: 1_700_100_100,
    });

    expect(event.kind).toBe(31778);
    expect(event.pubkey).toBe(ATTESTOR_A);
    expect(event.tags.map((tag) => tag[0])).toEqual(["d", "o", "n", "s", "m", "e", "alt"]);
  });
});

describe("validateSocialClaim", () => {
  test("accepts valid old and new role claims", async () => {
    const oldClaim = await buildSocialClaim({
      role: "old",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      signer: createFakeSigner(OLD_PUBKEY),
      createdAt: 1_700_100_000,
    });
    const newClaim = await buildSocialClaim({
      role: "new",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      signer: createFakeSigner(NEW_PUBKEY, "new"),
      createdAt: 1_700_100_001,
    });

    expect((await validateSocialClaim(oldClaim)).ok).toBe(true);
    expect((await validateSocialClaim(newClaim)).ok).toBe(true);
  });

  test("rejects a claim with a tampered event signature", async () => {
    const claim = await buildSocialClaim({
      role: "old",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      signer: createFakeSigner(OLD_PUBKEY),
      createdAt: 1_700_100_000,
    });

    expect(
      await validateSocialClaim({
        ...claim,
        sig: tamperHex(claim.sig!),
      }),
    ).toEqual({
      ok: false,
      code: "invalid_sig",
      reason: "STC event signature must pass Schnorr verification",
    });
  });
});

describe("validateSocialAttestation", () => {
  test("accepts valid support attestations", async () => {
    const attestation = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_A),
      stance: "support",
      method: "video",
      createdAt: 1_700_100_100,
    });

    const validated = await validateSocialAttestation(attestation);
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.stance).toBe("support");
      expect(validated.method).toBe("video");
      expect(validated.signatureStatus).toBe("verified");
    }
  });

  test("rejects an attestation with a tampered event signature", async () => {
    const attestation = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_A),
      stance: "support",
      method: "video",
      createdAt: 1_700_100_100,
    });

    expect(
      await validateSocialAttestation({
        ...attestation,
        sig: tamperHex(attestation.sig!),
      }),
    ).toEqual({
      ok: false,
      code: "invalid_sig",
      reason: "STA event signature must pass Schnorr verification",
    });
  });
});

describe("resolveSocialTransition", () => {
  test("returns none when claims are absent", async () => {
    const attestation = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_A),
      stance: "support",
      createdAt: 1_700_100_100,
    });

    expect(
      await resolveSocialTransition({
        viewerFollowSet: new Set([ATTESTOR_A]),
        oldPubkey: OLD_PUBKEY,
        newPubkey: NEW_PUBKEY,
        claims: [],
        attestations: [attestation],
      }),
    ).toEqual({ state: "none" });
  });

  test("returns claimed when only first-party claims exist", async () => {
    const claim = await buildSocialClaim({
      role: "old",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      signer: createFakeSigner(OLD_PUBKEY),
      createdAt: 1_700_100_000,
    });
    const selfSupport = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(OLD_PUBKEY, "self"),
      stance: "support",
      createdAt: 1_700_100_100,
    });

    expect(
      await resolveSocialTransition({
        viewerFollowSet: new Set([OLD_PUBKEY]),
        oldPubkey: OLD_PUBKEY,
        newPubkey: NEW_PUBKEY,
        claims: [claim],
        attestations: [selfSupport],
      }),
    ).toEqual({
      state: "claimed",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      claimIds: [claim.id!],
      claimRoles: ["old"],
      selfAssertedSupportPubkeys: [OLD_PUBKEY],
      selfAssertedOpposePubkeys: [],
    });
  });

  test("returns socially_supported and excludes self-attestation from third-party counts", async () => {
    const claim = await buildSocialClaim({
      role: "old",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      signer: createFakeSigner(OLD_PUBKEY),
      createdAt: 1_700_100_000,
    });
    const thirdPartySupport = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_A),
      stance: "support",
      createdAt: 1_700_100_100,
    });
    const selfSupport = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(NEW_PUBKEY, "self"),
      stance: "support",
      createdAt: 1_700_100_101,
    });

    expect(
      await resolveSocialTransition({
        viewerFollowSet: new Set([ATTESTOR_A, NEW_PUBKEY]),
        oldPubkey: OLD_PUBKEY,
        newPubkey: NEW_PUBKEY,
        claims: [claim],
        attestations: [thirdPartySupport, selfSupport],
      }),
    ).toEqual({
      state: "socially_supported",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      claimIds: [claim.id!],
      claimRoles: ["old"],
      supportPubkeys: [ATTESTOR_A],
      selfAssertedSupportPubkeys: [NEW_PUBKEY],
      selfAssertedOpposePubkeys: [],
    });
  });

  test("uses trusted pubkeys and keeps the lowest id on same-timestamp ties", async () => {
    const claim = await buildSocialClaim({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      signer: createFakeSigner(OLD_PUBKEY),
      createdAt: 1_700_100_110,
    });
    const support = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_A),
      stance: "support",
      createdAt: 1_700_100_111,
    });
    const oppose = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_A),
      stance: "oppose",
      createdAt: 1_700_100_111,
      content: "same timestamp tie",
    });
    const [lowerIdEvent, higherIdEvent] = [support, oppose].sort((a, b) => a.id!.localeCompare(b.id!));
    const expectedState =
      lowerIdEvent.tags.find((tag) => tag[0] === "s")?.[1] === "support" ? "socially_supported" : "socially_opposed";

    expect(
      await resolveSocialTransition({
        viewerFollowSet: new Set(),
        viewerTrustedSet: new Set([ATTESTOR_A]),
        oldPubkey: OLD_PUBKEY,
        newPubkey: NEW_PUBKEY,
        claims: [claim],
        attestations: [higherIdEvent, lowerIdEvent],
      }),
    ).toEqual({
      state: expectedState,
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      claimIds: [claim.id!],
      claimRoles: ["old"],
      ...(expectedState === "socially_supported"
        ? { supportPubkeys: [ATTESTOR_A] }
        : { opposePubkeys: [ATTESTOR_A] }),
      selfAssertedSupportPubkeys: [],
      selfAssertedOpposePubkeys: [],
    });
  });

  test("uses the latest attestation per attestor and can resolve split state", async () => {
    const oldClaim = await buildSocialClaim({
      role: "old",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      signer: createFakeSigner(OLD_PUBKEY),
      createdAt: 1_700_100_000,
    });
    const newClaim = await buildSocialClaim({
      role: "new",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      signer: createFakeSigner(NEW_PUBKEY, "new"),
      createdAt: 1_700_100_001,
    });
    const olderSupport = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_A),
      stance: "support",
      createdAt: 1_700_100_100,
    });
    const newerOppose = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_A, "latest"),
      stance: "oppose",
      createdAt: 1_700_100_200,
    });
    const secondSupport = await buildSocialAttestation({
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      attestorSigner: createFakeSigner(ATTESTOR_B),
      stance: "support",
      createdAt: 1_700_100_150,
    });

    expect(
      await resolveSocialTransition({
        viewerFollowSet: new Set([ATTESTOR_A, ATTESTOR_B]),
        oldPubkey: OLD_PUBKEY,
        newPubkey: NEW_PUBKEY,
        claims: [oldClaim, newClaim],
        attestations: [olderSupport, newerOppose, secondSupport],
      }),
    ).toEqual({
      state: "socially_split",
      oldPubkey: OLD_PUBKEY,
      newPubkey: NEW_PUBKEY,
      claimIds: [oldClaim.id!, newClaim.id!],
      claimRoles: ["old", "new"],
      supportPubkeys: [ATTESTOR_B],
      opposePubkeys: [ATTESTOR_A],
      selfAssertedSupportPubkeys: [],
      selfAssertedOpposePubkeys: [],
    });
  });
});

function createFakeSigner(pubkey: string, _suffix = "01"): SignerLike {
  const secretKeyHex = getSecretKeyForPubkey(pubkey);

  return {
    async getPublicKey() {
      return pubkey;
    },
    async signEvent(event: UnsignedNostrEvent) {
      return signNostrEventWithSecretKey(event, secretKeyHex);
    },
  };
}

function getSecretKeyForPubkey(pubkey: string): string {
  const secretKeyHex = SECRET_KEY_BY_PUBKEY.get(pubkey);
  if (!secretKeyHex) {
    throw new Error(`missing secret key for pubkey ${pubkey}`);
  }

  return secretKeyHex;
}

function tamperHex(value: string): string {
  const replacement = value.endsWith("0") ? "1" : "0";
  return `${value.slice(0, -1)}${replacement}`;
}

const SECRET_KEY_BY_PUBKEY = new Map<string, string>([
  [OLD_PUBKEY, OLD_SECRET_KEY],
  [NEW_PUBKEY, NEW_SECRET_KEY],
  [ATTESTOR_A, ATTESTOR_A_SECRET_KEY],
  [ATTESTOR_B, ATTESTOR_B_SECRET_KEY],
]);
