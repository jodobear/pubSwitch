# Design note: Why Nostr key transition should be two independent drafts

## Summary

The right public shape for Nostr key transition is **two independent, optional drafts**:

- **Prepared Migration**
- **Social Transition Claims and Attestations**

They address different questions.

Prepared Migration answers:

> Was this transition prepared in advance and cryptographically authorized?

Social Transition Claims and Attestations answers:

> Is there machine-readable social evidence that people recognize this transition?

These should not be merged into one authority model.

## Why separation is necessary

Earlier key-rotation discussion repeatedly surfaced two distinct pressures:

1. a desire for a narrow, protocol-level, cryptographic continuity mechanism;
2. a desire for social verification, warnings, and WoT-style confirmation.

When these concerns are merged into one standard, semantic problems appear:
- social objections can accidentally become cryptographic vetoes;
- transition claims get overloaded with “deprecate the old key” meaning;
- clients become unclear about what they are supposed to do automatically.

Separating them avoids that.

## Prepared Migration

Prepared Migration is for users who set something up in advance.

It standardizes:
- enrollment of a migration authority,
- optional authority update,
- execution of a transition to a successor key.

Its purpose is limited:
- it provides machine-readable cryptographic continuity;
- it does not define personhood;
- it does not define social legitimacy;
- it does not force client-side migration.

## Social Transition Claims and Attestations

Social Transition Claims and Attestations is for social signaling.

It standardizes:
- a claim that an old key and new key are socially connected;
- a latest-state attestation model for third parties.

Its purpose is also limited:
- it is advisory;
- it is useful even when no prepared migration exists;
- it does not override a cryptographic protocol;
- it does not prove continuity by itself.

## How clients should compose them

Clients should validate each draft independently, then merge them only in the UI.

Example outputs:

- Prepared Migration valid
- Socially supported
- Socially contested
- Social-only transition
- Prepared migration present, social objections present

The key rule is:

> Validation is separate. Presentation may be combined.

## Why this is politically better

This structure is more likely to land because it is:
- smaller
- more optional
- less ideological
- easier to implement incrementally
- less likely to trigger disputes about automatic client behavior

It also aligns better with Nostr’s bias toward user agency: clients can surface evidence without forcing a migration outcome.
