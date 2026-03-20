---
title: Handoff
doc_type: state
status: active
owner: tack
phase: p7-follow-on-options
canonical: true
---

# Handoff

Current execution state for `tack`.

## Read First

- `AGENTS.md`
- `.private-docs/README.md`
- `.private-docs/plans/build-plan.md`
- `.private-docs/plans/follow-on-options-packet.md`
- `.private-docs/research/proposal-and-research-review.md`

## Current Status

- Bootstrap is complete: control docs, research synthesis, workspace scaffold, and demo shell exist.
- Current goal remains a fast demoable PoC, not a production release.
- Existing proposal docs are strong enough to implement against, but not yet submission-ready.
- `protocol-shared` completion landed with deterministic canonical JSON, hex helpers, transition-id
  helpers, and shared tag helpers covered by tests.
- PMA foundation landed in `packages/protocol-a` with:
  - a PMA builder
  - PMA field validation
  - root-only resolver handling for `draft_local`, `published_pending_ots`, `bitcoin_confirmed`,
    and root conflict
  - semantic duplicate PMA-root collapse
- PMU and authority-chain support landed in `packages/protocol-a` with:
  - PMU detached-signature digest generation
  - PMU builder support
  - PMU validation against confirmed parent authority
  - PMA plus PMU authority-chain walking
  - semantic duplicate PMU collapse before fork detection
- semantically duplicate PMA roots are now treated as authority aliases during PMU-chain walking so
  equivalent roots can carry forward later updates
- PMX and execution support landed in `packages/protocol-a` with:
  - PMX detached-signature digest generation
  - PMX builder support
  - PMX validation against the active confirmed authority
  - execution resolution to either one successor or conflict
  - semantic duplicate PMX collapse before execution conflict detection
- semantically equivalent active-authority aliases are also honored during PMX lookup so duplicate
  equivalent PMU authorities do not strand valid executions
- current PMA validation uses local `x-verified-anchor-height` metadata on verified `1040` events
  to bridge OTS confirmation into the PoC until helper-side real proof parsing is fed back into the
  pure browser-safe resolver path
- shared Schnorr foundation landed in `packages/protocol-shared` with:
  - deterministic event-id recomputation
  - real event-signature verification
  - real detached-digest signature verification
  - deterministic fixed-key signing support for fixtures and tests
- `packages/protocol-shared` now depends directly on `@noble/curves` and `@noble/hashes` for the
  shared Schnorr helper surface
- Path A now performs real Schnorr verification for event signatures and detached signatures
- deterministic Path A fixtures, verification/publish scripts, and demo-client Path A evidence
  playback are complete
- Path C foundation landed in `packages/protocol-c` with:
  - STC builder support
  - STA builder support
  - STC and STA validation against transition-id, tag, and event-envelope shape rules
  - Path C resolution for `none`, `claimed`, `socially_supported`, `socially_opposed`, and
    `socially_split`
  - followed-attestor counting that excludes STAs by the old or new key from independent
    third-party support
- Path C now performs real Schnorr verification for STC and STA event signatures
- STA `e` references are currently validated for lowercase-hex event-id shape only; they are not
  dereferenced against STC objects during validation
- Path C live-attestation supersession uses newest `created_at`, then lexicographically higher event
  id as a deterministic PoC tie-break
- deterministic Path C fixtures and playback landed with:
  - fixture scenarios for claim-only, socially supported, socially split, and self-asserted-only
    noise
  - demo-client rendering that keeps Path C in a clearly separate advisory workspace
  - fixture generation, publish, and verification scripts that now cover both Path A and Path C
- recovery-bundle foundation landed in `apps/demo-client` with:
  - app-layer encrypted bundle helpers for build, export, import, and decrypt
  - deterministic round-trip and wrong-passphrase coverage
  - a basic recovery-bundle workspace in the demo client
- the current bundle payload stores `authority_event` and matching `ots_event` so the PoC can carry
  an active PMU authority, not just a root PMA snapshot
- the current bundle stores a demo migration secret string whose pubkey linkage is assumed by the
  app layer and not cryptographically derived in this PoC
- `bun run typecheck`, `bun test`, `bun scripts/verify-scenario.ts`, and `bun run build:demo` are
  green after the recovery-bundle closeout
- browser smoke passed for the updated demo UI, including export and decrypt of the recovery bundle;
  the only console error was a missing `favicon.ico`
- OTS helper foundation landed in `apps/ots-helper` with:
  - a pure proof-inspection path for `kind:1040` events
  - fixture-backed inspection of pending versus locally Bitcoin-confirmed proof status
  - a small CLI for fixture-scenario and stdin-driven inspection
- the helper still does not parse raw `.ots` bytes or independently validate Bitcoin attestations;
  it currently bridges the PoC's local `x-verified-anchor-height` metadata into a concrete tooling
  surface
- `bun run typecheck`, `bun test`, and `bun run --cwd apps/ots-helper start inspect-scenario confirmed-authority`
  are green after the OTS helper closeout
- OTS helper integration landed with:
  - helper-backed Path A proof posture checks in `scripts/verify-scenario.ts`
  - a small bridge module that aligns helper proof inspection with resolved Path A state
  - deterministic coverage for pending, confirmed, and conflict-state authority proof coverage
- `bun run typecheck`, `bun test`, and `bun scripts/verify-scenario.ts` are green after the OTS
  helper integration closeout
- the Path A proof-evidence implementation loop is now complete with:
  - helper-backed Path A posture cards in the demo
  - per-proof helper inspection rows in the demo
  - protocol/helper/app provenance disclosure in the Path A workspace
  - helper-status parity between the demo and `scripts/verify-scenario.ts`
- browser smoke passed for the updated Path A workspace on pending and confirmed fixture scenarios;
  the only console error remained the missing `favicon.ico`
- the Path A conflict-state implementation loop is now complete with:
  - structured conflict metadata in `packages/protocol-a`
  - helper bridge migration away from regex parsing
  - demo provenance and conflict display migration to the structured field
  - script parity for the structured conflict shape
- browser smoke passed for the conflicting-executions Path A scenario; the only console error
  remained the missing `favicon.ico`
- verification trust-model posture is now explicit:
  - remote OTS calendars or services may help produce or upgrade proofs
  - local verification should determine whether the PoC claims Bitcoin-confirmed status
  - Applesauce stays an app-layer tool and is not assumed to be the OTS verifier
- the verification-credibility implementation loop is complete with:
  - verification trust-model closeout
  - shared Schnorr verification helpers
  - Path A real Schnorr verification
  - Path C real Schnorr verification
- deterministic fixtures and tests now use real fixed keypairs instead of synthetic signature hex
- the Path A conflict-playback implementation loop is complete with:
  - deterministic root and child conflict fixtures
  - helper guardrails for plural-authority conflicts
  - Path A demo playback for the new conflict scenarios
  - script and doc parity for the finished conflict lane
- browser smoke passed for the conflicting-roots and conflicting-children Path A scenarios; the only
  console error remained the missing `favicon.ico`
- real OTS verification foundation landed in `apps/ots-helper` with:
  - a real local `.ots` parsing and digest-binding path in `real-inspect.ts`
  - deterministic bundled OTS vectors for one pending proof and one Bitcoin-attested proof
  - helper CLI support for `inspect-vector` and real-proof inspection without `x-verified-anchor-height`
- the current helper-side real OTS path verifies proof deserialization, target-digest binding, and
  Bitcoin-attestation presence/height locally, but does not yet perform independent block-header
  verification against a Bitcoin node or explorer
- the browser demo stays on the lightweight fixture inspection path because importing the
  OpenTimestamps dependency tree into the browser caused runtime incompatibilities
- `bun run typecheck`, `bun test`, `bun scripts/verify-scenario.ts`, `bun run build:demo`, and
  `bun run --cwd apps/ots-helper start inspect-vector sample-bitcoin-confirmed` are green after the
  real OTS verification closeout
- browser smoke passed for the demo after the helper/browser split; the only console error remained
  the missing `favicon.ico`
- the Path A real OTS corpus implementation loop is now complete with:
  - deterministic helper-side real PMA corpus items for pending and Bitcoin-attested proofs
  - stored canonical preimages for those PMA events
  - helper CLI corpus inspection via `inspect-corpus`
  - script parity via `bun run verify:real-ots-corpus`
- the corpus still relies on locally prepared attestations and does not yet perform independent
  Bitcoin block-header verification
- the Path A real OTS bridge implementation loop is now complete with:
  - the real corpus moved into a pure browser-safe fixture module in `packages/fixtures`
  - helper verification now layers on top of that shared pure corpus source
  - the Path A demo now shows a separate real-corpus snapshot panel with explicit provenance
  - CLI and script surfaces now report the shared pure corpus source explicitly
- the Path A real OTS adoption loop is now complete with:
  - `pending-ots` now reuses the shared real pending PMA corpus item in the main Path A walkthrough
  - `real-confirmed-pma` now provides a simple real helper-verified confirmed scenario in the main Path A walkthrough
  - demo, publish, and verify surfaces now label real-backed versus placeholder-backed Path A scenarios explicitly
  - the single-root authority-chain family was intentionally left for the next narrow adoption lane
- the Path A real OTS chain-root loop is now complete with:
  - `confirmed-authority` now reuses the shared real confirmed PMA root
  - `conflicting-children`, `executed-happy-path`, and `conflicting-executions` now reuse the same real confirmed PMA root
  - mixed real-root versus placeholder-chain proof backing was made explicit across demo, verify, publish, and app provenance surfaces before the later follow-on upgrades landed
- demo readiness is now complete with:
  - a shared walkthrough model in `packages/fixtures`
  - a browser-visible Demo Walkthrough panel with Path A backing coverage, recommended order, and current caveats
  - a terminal walkthrough command at `bun run demo:walkthrough`
  - one coherent operator story across demo, verify, and documentation surfaces
- the first two follow-on options are now complete with:
  - a second real confirmed PMA root in the shared real corpus for the root-conflict demo
  - real PMU `.ots` proof pairs in the shared real corpus for the main authority-chain scenarios
  - all seven main Path A walkthrough scenarios now marked `real_helper_verified`
  - scenario/demo/script surfaces now expose multiple shared real corpus ids where one scenario reuses several real proof sets
- the demo client has now been reshaped from an evidence-heavy inspector into a presentation-first
  live stage with:
  - stepwise publish controls for Path A and Path C
  - paced autoplay for live walkthroughs
  - explicit old-key, authority, and continued-identity status cards in the Path A lane
  - recovery kept as a separate third act
  - the wire inspector still available, but collapsed by default
- browser smoke passed for the live stage:
  - Path A publish-step walkthrough shows signed intent, pending proof, and updated key-state cards
  - Path C deck opens separately and preserves advisory-only framing
  - Recovery deck opens cleanly
  - fresh browser launch is now console-clean after adding a favicon placeholder
- the demo client now also has a public-relay live operator/observer mode:
  - browser connects directly to public relays instead of a local demo relay
  - operator can publish live kind `1` notes from the prepared demo keys
  - operator can publish prepared Path A / Path C event sets to those relays
  - observer state is rebuilt only from relay subscription traffic
  - pending proof bytes surface embedded calendar hints when present
- the public-relay client visuals were polished for live presentation:
  - stronger stage framing and darker hero treatment
  - clearer operator versus observer separation
  - cleaner action cards, receipts, and status surfaces
  - the live flow remains the same; this was a front-end hierarchy pass, not a protocol change
- the public-relay client has now been reduced further into a cleaner live console:
  - relay configuration is collapsed by default
  - the publish lane centers on one note composer and one next-action card
  - the observer lane centers on inferred state, relay health, and the live feed
  - scenario summary copy was removed from the main viewport to keep the screen action-first
- the public-relay client first viewport now follows a stricter demo contract:
  - actor, next action, identity state, proof state, network status, and live feed only
  - queue, relay configuration, backup export, and raw-event inspection are all behind disclosure
  - duplicate relay surfaces and noisy receipt text were removed from the first fold
  - the first screen now survives live connect and note-publish interaction without overflow
- a follow-up live-demo UX bug pass is now complete:
  - the set-switch blank-screen crash is fixed
  - relays now render as passive status chips in the masthead instead of as editable settings
  - recovery backup passphrase now starts empty instead of prefilled
  - the pending Path A walkthrough now exposes an explicit onboarding card for load onboarding set -> auto 1776 + 1040 -> passphrase -> backup
  - a terminal demo path now exists at `bun run demo:cli <scenario-id>`
- the terminal demo path is now more operator-usable:
  - `bun run demo:cli share <scenario-id> [old|new|actor-index]` prints an `npub` and terminal QR code for follow/share
  - the CLI still prints deterministic Path A and Path C action/state progression for the chosen scenario
- the terminal demo path is now a real operator companion:
  - `bun run demo:cli publish <scenario-id>` publishes the prepared scenario events to public relays
  - `bun run demo:cli note <scenario-id> [old|new|actor-index] [content...]` publishes a live kind `1`
  - `bun run demo:cli watch <scenario-id>` subscribes to relays and prints relevant events plus resolved state changes
  - `bun run demo:cli onboard` prompts for a backup passphrase, writes an encrypted onboarding bundle, prints a follow/share QR, and auto-publishes the prepared `1776` + `1040` onboarding events
- the terminal demo path now also has a stage wrapper:
  - `bun run demo:cli run <scenario-id>` prints the actor QR, publishes an optional live kind `1`, publishes the prepared scenario events, and watches relay activity/state in one command
  - `bun run demo:cli run <scenario-id> --dry-run` rehearses the same story without opening relay sockets
  - `bun run demo:story <scenario-id>` is a short alias for the same wrapper
- the browser operator console was refactored into a thinner app-layer shape:
  - relay/session/publish/bundle logic now lives in `apps/demo-client/src/use-live-operator.ts`
  - UI text/state formatting now lives in `apps/demo-client/src/operator-view.ts`
  - `apps/demo-client/src/App.tsx` now renders a smaller operator/observer console over that shared surface
  - the first viewport now centers on one primary script action, one live note composer, one state panel, and one relay-observed feed
- the browser observer subscription path is now more demo-correct:
  - live kind `1` notes remain session-scoped by `since`
  - prepared protocol and proof events are now subscribed by exact event ids instead of by current-session timestamps
  - this fixes the regression where `1776` and `1040` events could fail to appear while live notes still showed up
- the browser demo now exposes five explicit demo shapes instead of one overloaded screen:
  - `Onboarding`: prepared key package -> passphrase -> backup -> publish `1776` -> publish `1040`
  - `Path A Live`: live notes plus real Path A continuity events on relays
  - `Path A Replay`: deterministic stepwise conflict and authority-chain playback
  - `Path C Live`: live claims and attestations as a separate advisory surface
  - `Path C Replay`: deterministic support/split advisory playback
- the browser demo now also exposes a separate follower-side rotation act:
  - `Follower View`: the client UX for someone who follows a rotating key
  - it is driven by Path A relay-visible events and shows a banner/warning surface instead of an operator console
  - it is scoped to the currently selected Path A scenario, meaning "pretend you follow this selected old key", not to every demo scenario at once
  - it now also has a deterministic stepwise follower walkthrough so the room can watch the banner logic change after each published event
  - once a followed account publishes an executed `1777`, the viewer-side page exposes a direct path into the Path C attestation flow
  - local `accept` / `reject` / `ignore` choices on that page are client UX only, not protocol-defined actions
- the browser demo now has two top-level presentation surfaces:
  - `pubSwitch` stage is now the default onstage surface
  - the existing console remains the fuller backstage operator/observer workspace
  - the onstage surface is no longer a generic publish/view/result explainer
  - it is now a story-first product demo with dedicated screens for:
    - `Sign Up`
    - `Prepared Migration`
    - `What Followers See`
    - `Social Confirmation`
    - `Contested Case`
  - each onstage story now has one primary action area, one client conclusion card, and one compact evidence rail
  - the stage surface now follows the v2 public framing:
    - `Prepared Migration`
    - `Social Transition`
    - follower UX and client actions are presentation-first
    - internal `Path A` / `Path C` language is kept backstage
  - the stage also exposes two curated Path A presets on top of the real proof-backed fixture set:
    - `happy` -> `executed-happy-path`
    - `contested` -> `conflicting-executions`
  - the CLI now accepts the same aliases, so `bun run demo:story happy` and `bun run demo:story contested` work directly
- demo-shape routing is now explicit in `apps/demo-client/src/demo-shapes.ts`, including per-act package filtering and sensible defaults
- onboarding now has a clearer signup UX in both surfaces:
  - web onboarding collects a handle plus passphrase confirmation before bundle export and event publication
  - web onboarding now also has a one-click `Finish signup and publish 1776 + 1040` path once relays are connected
  - relay connect/disconnect controls are back in the global header so onboarding is not stranded without a network control
  - CLI onboarding is now a signup-style wizard with handle, passphrase confirmation, QR/`npub`, and optional immediate publish of `1776` + `1040`
  - CLI onboarding also accepts non-interactive flags for rehearsal and scripted demos
- Path C now has a dedicated audience-rotation demo surface in the browser:
  - 21 seeded audience keys follow the old key
  - the old key follows 12 of them back
  - the UI steps through STC publication, followed-attestor STAs, and supported/split/self-noise outcomes
  - the user-facing client panel now exposes warnings, inspectable evidence, and local `accept` / `reject` / `ignore` choices
  - those three choices are a PoC client-action inference for demo UX, not wire-level NIP semantics
- public relays do not reliably echo immediate `OK` or `EVENT` frames for prepared historical-id scenario events, so CLI publish/onboard output now reports both:
  - `expected_state=<fixture expectation>`
  - `observed_state=<relay-observed state or no relay echo observed yet>`
- the onboarding card intentionally loads the prepared onboarding identity rather than pretending to mint a fresh real `.ots` proof on demand
- browser smoke passed for the public-relay client against `wss://relay.damus.io`, `wss://nos.lol`,
  and `wss://relay.primal.net`:
  - relay connections opened and reached `synced`
  - a live kind `1` note was published and observed back through the relay feed
  - prepared protocol events now surface relay receipts explicitly so duplicate/fresh-set issues are
    visible during the demo
- browser smoke also passed for the new onstage story surface using Playwright CLI:
  - `Sign Up`, `Prepared Migration`, and `What Followers See` loaded without blanking
  - the new onstage layout rendered the intended story nav, action card, client conclusion card, and evidence rail
- onstage event progression is now consistent across stories:
  - `queued`
  - `sent`
  - `seen on relays`
- Path A prepared publish order now follows protocol logic instead of raw fixture timestamps:
  - PMA
  - 1040 for PMA
  - PMU
  - 1040 for PMU
  - PMX
- the follower story now has a stronger preview path:
  - if publish progressed but relay echo is lagging, the follower banner can still advance
  - the UI labels that state explicitly as `sent to relays`
- fixed prepared protocol events still use fixed ids, so repeat live demos need fresh prepared sets
  if a relay has already seen a given PMA/PMU/PMX/1040 event id
- after the onstage rewrite, `bun run typecheck`, focused app tests, `bun run build:demo`, and
  Playwright CLI smoke are green
- the current active slice is `follow-on-options-packet.md`
- no active autonomous implementation loop is currently queued
- Agreed PoC decisions, Path C anti-noise posture, and a simple threat table are recorded in
  `.private-docs/research/proposal-and-research-review.md`.
- repo is now a git repository with `origin` set to `git@github.com:jodobear/pubSwitch.git`
- current pushed branch is `main` at commit `7fc6bc8` (`Initial pubSwitch PoC`)

## Active Control Docs

- `AGENTS.md`
- `.private-docs/README.md`
- `.private-docs/plans/build-plan.md`
- `.private-docs/plans/follow-on-options-packet.md`
- `.private-docs/guides/PROCESS_CONTROL.md`
- `.private-docs/guides/FAST_POC_GATE.md`

## Critical Rules

- keep Path A and Path C independent in pure protocol packages
- keep the process light, but keep slices explicit
- fix protocol-shape ambiguity in docs before hard-coding it into multiple packages
- prefer deterministic fixtures over broad speculative implementation

## Next Work

- treat the repo as demo-ready by default
- use the public-relay operator/observer client as the primary live demo surface
- use the older stage/inspector only when the audience wants slower explanation or wire detail
- only choose follow-on work explicitly:
  - independent Bitcoin block-header verification if attestation presence/height is no longer enough
  - fresh prepared public-relay demo sets if repeated live relay demos start hitting duplicate-event friction
- keep remote proof production and local proof verification clearly separate in the demo trust model
- preserve the browser/helper boundary so real OTS verification does not get bundled straight into the demo client
- preserve the rule that helper-backed authority coverage only applies where one active authority exists
- preserve the rule that remote OTS services do not become the final trust root for demo truth
- record any remaining `.ots` operational ambiguity explicitly instead of implying unsupported checks
- keep the current `x-verified-anchor-height` bridge explicit until the repo is ready to feed helper-side real proof results back into browser-safe fixture resolution
