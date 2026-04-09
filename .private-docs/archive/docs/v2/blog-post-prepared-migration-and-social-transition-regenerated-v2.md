# Prepared Migration and Social Transition: a cleaner way to talk about key transition on Nostr

Nostr key transition has been hard to discuss because several different problems keep getting collapsed into one.

Sometimes people mean:

- “How can a user prepare in advance so they still have a cryptographic continuity path if a key is lost or exposed?”

Other times they mean:

- “How can a user tell people that they moved to a new key, and how can friends or trusted contacts signal that they believe the move is legitimate?”

Those are not the same problem.

That is why the right public shape is two independent drafts:

- **Prepared Migration**
- **Social Transition Claims and Attestations**

## Prepared Migration

Prepared Migration is the cryptographic side.

A user opts in ahead of time by publishing a migration authority that is anchored with OpenTimestamps. Later, if migration is needed, the active migration key can authorize a move to a successor key.

This is narrow by design.

Prepared Migration does not:
- solve unprepared recovery;
- define social legitimacy;
- prove personhood;
- force clients to rewrite follows or trust labels.

It only standardizes one bounded thing: prepared cryptographic continuity.

## Social Transition Claims and Attestations

Social Transition Claims and Attestations is the social side.

It lets users and communities express a machine-readable transition claim, and lets third parties publish their latest stance on that claim.

This is also narrow by design.

It does not:
- provide cryptographic recovery;
- replace a prepared migration protocol;
- force distrust of the old key;
- define a universal trust algorithm.

It only standardizes a social signaling layer.

## Why not combine them?

Because when you combine them, each one starts to distort the other.

A social objection can accidentally start to behave like a veto over cryptographic continuity.
A social claim can accidentally inherit “revocation” semantics that not everyone wants.
Clients become unclear about what should be surfaced, what should be recommended, and what should never be done automatically.

Keeping them separate avoids that.

## How they fit together

Clients can still show both.

A profile view might say:

- Prepared migration exists
- People you trust also support this transition

Or:

- No prepared migration exists
- Social claim present
- Two people you follow confirmed it

That gives users more evidence without pretending all evidence is the same kind.

## The principle

The principle is simple:

> Validate separately. Present together if useful.

That is a cleaner fit for both Nostr’s protocol style and Nostr’s politics.

It is also easier to implement incrementally. A signer or bunker can implement Prepared Migration first. A social client can implement Social Transition first. A richer client can do both.

That is the path that seems most likely to be understood, implemented, and adopted.
