# PR message: Social Transition Claims and Attestations

This PR proposes **Social Transition Claims and Attestations**, an optional social signaling protocol for Nostr identity transition.

This draft intentionally does **not** attempt to provide cryptographic recovery or proof of continuity. Instead, it standardizes a machine-readable form for social transition signaling:

- `kind:1778` Social Transition Claim (STC)
- `kind:31778` Social Transition Attestation (STA)

The claim is immutable. The attestation is addressable and intentionally represents the attestor’s latest stance for a given transition.

This proposal is intentionally independent from Prepared Migration and from any other cryptographic migration protocol. It is useful for:
- legacy users who did not enroll a prepared migration path,
- clients that want to surface social evidence,
- communities that want explicit machine-readable attestations,
- disputed or ambiguous transitions where users need human context.

Why a separate draft:

- social signaling and prepared cryptographic continuity are different layers;
- keeping them separate avoids overloading one event with conflicting meanings;
- clients can implement either draft independently and combine them only in presentation.

Review focus requested:
- claim and attestation semantics
- addressable latest-state behavior
- anti-spam posture
- third-party support/opposition handling
- client presentation guidance
