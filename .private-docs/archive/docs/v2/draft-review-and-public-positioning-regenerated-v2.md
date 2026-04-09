# Draft review and public positioning

## Summary

The current two-draft structure is the right public structure.

- **Prepared Migration** should remain a narrow, optional, cryptographic continuity mechanism.
- **Social Transition Claims and Attestations** should remain a separate, optional, social signaling and attestation mechanism.
- The two drafts should be presented as **orthogonal standards**, not as competing solutions to the same problem.

## Public names

Use these names in public documents:

- **Prepared Migration**
- **Social Transition Claims and Attestations**

Avoid using internal labels like “Path A” and “Path C” outside internal notes.

## Positioning

### Prepared Migration

Public framing:

- opt-in
- bounded
- prepared in advance
- cryptographic continuity
- independent from social trust
- does not force client behavior

Avoid framing it as:

- a universal recovery solution
- proof of personhood
- a complete identity system
- something clients should auto-apply

### Social Transition Claims and Attestations

Public framing:

- advisory
- social
- viewer-relative
- current stance
- independent from Prepared Migration
- useful even when no prepared migration exists

Avoid framing it as:

- mandatory distrust of the old key
- universal revocation
- cryptographic proof
- forced migration

## Draft changes worth keeping

### Prepared Migration

Keep:
- immutable PMA / PMU / PMX events
- OTS-backed authority establishment and update
- conflict detection
- explicit independence from the social layer

Important implementation clarifications:
- collapse semantic duplicates before conflict classification;
- clarify discovery/query guidance using indexed tags;
- keep local pending-OTS states as UX, not protocol validity.

### Social Transition Claims and Attestations

Keep:
- immutable claim event;
- addressable attestation event;
- explicit acceptance of the “live current stance over public history” tradeoff;
- explicit independence from Prepared Migration.

Important clarifications:
- exclude `O` and `N` from third-party support counts by default;
- explicitly inherit NIP-01 latest-state semantics for addressable attestations;
- keep anti-spam rules simple: claims are the anchor object, attestations refine them.

## NIP numbering / politics

For public submission, keep placeholders:

- `NIP-XX` for Prepared Migration
- `NIP-XY` for Social Transition Claims and Attestations

If you want to frame Prepared Migration as continuing earlier key-rotation / “NIP-41-era” work, say so as historical context, not as an official assigned number.

Suggested wording:

> Prepared Migration is proposed as a continuation of earlier key-rotation discussions that were often grouped under the old NIP-41 topic area.

For Social Transition Claims and Attestations, simply submit as its own draft NIP and let maintainers assign the number.

## Recommendation

Submit:

1. Prepared Migration PR
2. Social Transition Claims and Attestations PR
3. short design note
4. short blog post
5. implementation / PoC link or plan

That is the best balance of political clarity, technical scope, and implementation credibility.
