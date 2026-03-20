---
title: Build Plan
doc_type: plan
status: active
owner: tack
phase: p7-follow-on-options
canonical: true
---

# tack Build Plan

Date: 2026-03-19

## Strategic Posture

- `tack` is a fast PoC repo for validating a new key-rotation proposal.
- The primary goal is a credible demo and feedback loop, not a final standards artifact.
- Path A and Path C stay separate in code, validation, and resolution.
- Applesauce is the application layer; protocol logic stays in pure packages.
- encrypted recovery-bundle UX is in scope because it helps prove Path A is a viable user flow.
- remote OTS calendars or services may help produce or upgrade proofs, but local verification
  should determine whether the demo claims Bitcoin-confirmed status.

## Research Baseline

- current proposal docs are sufficient to start implementation
- they are not yet submission-ready
- the highest-risk gaps are in authority-chain ambiguity, OTS operational modeling, and detached
  signature interoperability details

## Chosen Repo Shape

- `apps/demo-client`
  - demo UI, evidence inspector, and recovery-bundle flow
- `apps/ots-helper`
  - local helper or CLI wrapper for OTS flows
- `packages/protocol-shared`
  - canonicalization, hex/hash helpers, shared types/errors
- `packages/protocol-a`
  - PMA / PMU / PMX codecs, validators, resolver
- `packages/protocol-c`
  - STC / STA codecs, validators, resolver
- `packages/applesauce-adapters`
  - EventStore / RelayPool / signer / loader glue
- `packages/fixtures`
  - deterministic happy-path and adversarial scenarios

## Active Phases

- `P0`
  - bootstrap repo, process surface, and scaffold
- `P1`
  - implement shared protocol helpers
- `P2`
  - implement Path A builders, validators, resolver
- `P3`
  - implement Path C builders, validators, resolver
- `P4`
  - wire demo-client and fixtures for a fast walkthrough

## Current Baseline

- bootstrap is complete
- dependency install is complete
- `protocol-shared` completion is complete and test-backed
- PMA foundation is complete with builder, validator, and root-only resolver coverage
- PMU builder, validator, detached-signature digest generation, and authority-chain walking are
  complete
- PMX builder, validator, detached-signature digest generation, and execution resolution are
  complete
- deterministic Path A fixtures, fixture scripts, and demo-client evidence playback are complete
- Path C builders, validators, and resolver are complete in `packages/protocol-c`
- deterministic Path C fixtures, fixture scripts, and separate demo-client playback are complete
- encrypted recovery-bundle export/import is complete in the demo client
- OTS helper foundation is complete with fixture-backed `1040` proof inspection
- helper-backed Path A proof verification is now integrated into `scripts/verify-scenario.ts`
- the Path A proof-evidence implementation loop is complete:
  - helper-backed Path A posture is visible in the demo
  - per-proof helper inspection is visible in the demo
  - protocol/helper/app provenance disclosure is visible in the demo
  - helper-status wording now aligns across the demo and `scripts/verify-scenario.ts`
- the Path A conflict-state implementation loop is complete:
  - structured conflict metadata landed in `packages/protocol-a`
  - helper bridge conflict handling now consumes the structured field
  - the demo conflict view now consumes the structured field
  - script and fixture parity stayed deterministic
- verification trust-model posture is now explicit in research and planning docs
- the verification-credibility loop is complete:
  - shared Schnorr verification helpers landed in `protocol-shared`
  - Path A now performs real event and detached Schnorr verification
  - Path C now performs real event Schnorr verification
  - deterministic fixtures now use real fixed keypairs instead of synthetic signature hex
- the Path A conflict-playback loop is complete:
  - deterministic root and child conflict fixtures landed
  - plural-authority helper guardrails landed
  - Path A conflict playback and provenance landed in the demo
  - script/doc parity for the finished conflict lane is complete
- the real OTS verification foundation packet is complete:
  - `apps/ots-helper` now has a real local `.ots` parsing and digest-binding path
  - deterministic helper vectors cover one pending proof and one Bitcoin-attested proof
  - helper CLI inspection can now verify those vectors without `x-verified-anchor-height`
  - the current helper path does not yet perform independent block-header verification against a
    Bitcoin node or explorer
  - the browser demo remains on the lightweight fixture inspection path after a discovered browser
    incompatibility when bundling the OpenTimestamps dependency tree directly
- the Path A real OTS corpus loop is complete:
  - deterministic real PMA corpus items now exist with signed PMA events, canonical preimages, and
    real serialized `.ots` proof bytes
  - `apps/ots-helper` can inspect those corpus items directly through `inspect-corpus`
  - `bun run verify:real-ots-corpus` now rechecks preimage binding and helper verification parity
  - the corpus still uses locally prepared attestations and does not yet do independent
    block-header verification
- the Path A real OTS bridge loop is complete:
  - the real corpus now lives in a pure browser-safe fixture module
  - helper inspection still validates that shared data against real `.ots` proof bytes
  - the Path A demo now shows a separate real-corpus snapshot lane with explicit provenance
  - CLI and script surfaces now both identify the shared pure corpus source
- the Path A real OTS adoption loop is complete:
  - `pending-ots` now reuses the shared real pending PMA corpus item in the main Path A fixture list
  - `real-confirmed-pma` now adds a simple real helper-verified confirmed scenario to the main Path A walkthrough
  - Path A demo and script surfaces now label real-backed versus placeholder-backed scenarios explicitly
  - the single-root authority-chain family was intentionally deferred to the next narrow adoption lane
- the Path A real OTS chain-root loop is complete:
  - `confirmed-authority` now reuses the shared real confirmed PMA root
  - `conflicting-children`, `executed-happy-path`, and `conflicting-executions` now reuse the same real confirmed PMA root
  - demo, verify, publish, and app provenance surfaces began distinguishing fully real-backed, mixed-backed, and placeholder-backed Path A scenarios before the later follow-on upgrades landed
- demo-readiness packet is complete:
  - the repo now has one shared walkthrough model for the live PoC story
  - the browser demo shows operator-facing walkthrough order, coverage counts, and caveats
  - `bun run demo:walkthrough` prints the same story in the terminal
- the first two follow-on options are now complete:
  - a second real confirmed PMA root exists for the root-conflict demo
  - real PMU `.ots` proofs now exist for the authority-chain scenarios
  - all seven main Path A walkthrough scenarios are now fully real helper-verified from the fixture/demo point of view
  - script, publish, demo, and corpus surfaces now expose multiple shared real corpus ids where one scenario reuses several real proof sets
- narrow live-demo polish is now complete:
  - the demo client now defaults to a presentation-first stage instead of a dense forensic layout
  - Path A and Path C each have stepwise publish controls and paced autoplay
  - Path A now exposes explicit old-key, authority, and continued-identity state cards during playback
  - recovery remains a separate third act and the wire inspector stays collapsed by default
  - a favicon placeholder now keeps fresh browser launches console-clean during the live demo
- a real public-relay demo client is now complete:
  - browser connects directly to public relays rather than to a repo-local relay
  - operator can publish live kind `1` notes from prepared demo keys
  - operator can publish prepared Path A and Path C event sets to those relays
  - observer state is derived only from live relay subscription traffic
  - relay receipts are surfaced so duplicate-event friction is visible during live demos
  - the presentation layer has been polished so the live client reads like a demo console rather
    than a raw form surface
  - the first viewport is now further reduced into a cleaner live console with collapsed relay
    settings, one dominant next-action card, and less narrative copy
  - the first viewport now follows a strict demo contract:
    - actor and next action on the operator side
    - identity state, proof state, network status, and live feed on the observer side
    - queue, relay configuration, backup export, and raw-event inspection hidden behind drawers
  - the follow-up operator polish pass is also complete:
    - relay status is now passive masthead telemetry rather than editable config
    - backup passphrase now starts empty
    - the pending onboarding lane now has an explicit onboarding card for prepared identity load, auto-staged 1776 + 1040, passphrase, and backup export
    - a CLI demo companion now exists at `bun run demo:cli <scenario-id>`
    - terminal share/follow support now exists via `bun run demo:cli share <scenario-id> [old|new|actor-index]`, which prints an `npub` and ASCII QR code
    - the CLI now also supports:
      - `bun run demo:cli publish <scenario-id>`
      - `bun run demo:cli note <scenario-id> [old|new|actor-index] [content...]`
      - `bun run demo:cli watch <scenario-id>`
      - `bun run demo:cli onboard`
      - `bun run demo:cli run <scenario-id>` for one-command stage flow
      - `bun run demo:cli run <scenario-id> --dry-run` for local rehearsal
      - `bun run demo:story <scenario-id>` as a short alias
    - the browser operator console has now been refactored into a thinner app-layer shape:
      - relay/session/publish/bundle logic lives in `use-live-operator.ts`
      - text/state formatting lives in `operator-view.ts`
      - `App.tsx` was reduced to a smaller operator/observer shell over those modules
      - the first viewport now emphasizes one script action, one live note composer, one state panel, and one feed
      - relay subscriptions now treat the two demo surfaces differently:
        - live kind `1` notes stay session-scoped by `since`
        - prepared protocol and proof events subscribe by exact event ids so historical `1776` / `1040` timestamps do not disappear from the observer feed
      - the browser demo now exposes six explicit demo shapes:
        - onboarding
        - Path A live
        - Path A replay
        - follower view
        - Path C live
        - Path C replay
      - act routing and defaults are now frozen in `demo-shapes.ts` so future UI passes do not collapse those flows back into one overloaded screen
      - the new follower-view act captures the second key-rotation perspective:
        - a person seeing a followed key rotate
        - a banner driven by Path A relay-visible state
        - a deterministic stepwise follower walkthrough for teaching how the banner evolves as each event appears
        - explicit scoping to the currently selected Path A scenario rather than "following every scenario"
        - a direct jump into Path C attestation after an executed `1777`
        - explicit local `accept` / `reject` / `ignore` choices as UI-only handling, not protocol actions
      - a separate minimalist `pubSwitch` stage page now exists:
        - branding is `pubSwitch`
        - it is cleaner and more presentation-first than the console
        - it is now the default onstage surface, while the old console is explicitly backstage
        - it walks through publish -> view -> result with back / next / auto controls
        - it reuses deterministic Path A / Path C playback models rather than replacing the operator console
        - it now also exposes two curated Path A stage presets:
          - `happy` -> `executed-happy-path`
          - `contested` -> `conflicting-executions`
        - the CLI accepts the same aliases for stage-safe demo scripts
        - it now frames the onstage experience around five named stories instead of exposing internal act/scenario structure first:
          - `Sign Up`
          - `Happy Rotation`
          - `What Followers See`
          - `Social Confirmation`
          - `Contested Case`
      - onboarding now reads more like signup in both surfaces:
        - web onboarding collects handle + passphrase confirmation before backup export and publish
        - web onboarding now has a one-click finish-signup publish path and the relay connect control is back in the global header
        - CLI onboarding is now a signup wizard with handle, passphrase confirmation, share card, and optional immediate publish
        - CLI onboarding also supports non-interactive flags for scripted rehearsal
      - Path C live now includes a dedicated audience-rotation simulator:
        - 21 seeded audience keys follow the old key
        - the old key follows 12 of them back
        - the UI steps through claims, followed-attestor STAs, and supported/split/self-noise states
        - a client-side decision panel now exposes local `accept` / `reject` / `ignore` actions and raw evidence inspection
        - those local actions are a PoC UI inference for user handling, not protocol-defined wire behavior
    - the set-switch runtime crash caused by a stale synthetic event read is fixed
    - prepared historical-id scenario events still do not get reliable immediate echo/receipt behavior from all public relays, so CLI publish/onboard output reports both expected fixture state and any relay-observed state
- current active packet is `follow-on-options-packet.md`
- no active autonomous implementation loop is currently queued
- next execution target is optional follow-on work only if the operator explicitly chooses it
- agreed PoC decisions and Path C anti-noise notes are captured in
  `proposal-and-research-review.md`
- after the operator-console refactor, `bun run typecheck`, focused app tests, and `bun run build:demo`
  are green; local Playwright smoke on this headless box is currently blocked by the available
  browser tooling

## Active Rules

- use `FAST_POC_GATE.md` for code-bearing slices
- keep draft critique in `proposal-and-research-review.md`
- prefer deterministic fixtures to broad feature work
- keep demo scope honest about protocol gaps and shortcuts
- do not treat remote OTS services as the final truth source for Bitcoin-confirmed demo claims

## Light Quality Gates

- `bun run typecheck`
- `bun test`
- manual smoke for UI changes

## Open Questions

- when and how helper-side real `.ots` verification should feed back into Path A script or demo surfaces
- whether the demo should keep using local `x-verified-anchor-height` bridge tags or start consuming helper-backed real proof results directly in a browser-safe way
- whether duplicate-PMU normalization across semantically equivalent parent-authority aliases should
  become an explicit protocol note rather than only a PoC implementation rule
- whether duplicate-PMX normalization across semantically equivalent active-authority aliases should
  also be promoted from PoC behavior to explicit protocol note
- whether Path C should keep `uncertain` as raw evidence only or grow a separate visible resolver
  state in a later slice
- whether STA `e` references should stay shape-only in the PoC or begin dereferencing validated STC
  claim ids in a later slice
- whether the Path C live-attestation tie-break should be promoted from PoC determinism to an
  explicit protocol note
- whether the recovery bundle should stay on `authority_event` for the PoC or later narrow back to
  a stricter root-only payload shape
- whether helper inspection output should first bridge into scripts, demo evidence, or adapter-layer
  loading before any validator-adjacent use once the current tag bridge stops being sufficient
- whether the repo should start minting fresh prepared public-relay demo sets routinely so repeated
  live demos do not depend on fixed event ids remaining unpublished on the selected relays
