---
title: Current Options Packet
doc_type: packet
status: active
owner: tack
phase: p9-cross-lane-audit
canonical: true
---

# Current Options Packet

Current optional work after the CLI-first v3 cleanup, hardening pass, and adversarial audit.

## Purpose

- keep the active control surface aligned to the current CLI/helper repo shape
- record the highest-value optional next phases without dragging old demo/browser framing into startup
- give the next session one clean place to choose whether to stop, deepen, or productionize

## Current Baseline

- the active implementation surface is the CLI-first v3 operator lane
- the public workflow commands are:
  - `prepared-migration`
  - `social-transition`
  - `operate-transition`
- the repo no longer carries a browser app or frontend build surface
- public docs route through:
  - `README.md`
  - `docs/INDEX.md`
  - `docs/operator-runbook.md`
  - `docs/demo-script.md`
  - `testing/README.md`
- the cross-lane audit output now lives in:
  - `.private-docs/research/cross-lane-adversarial-audit.md`
- the next implementation-ready packet now lives in:
  - `.private-docs/plans/cross-lane-remediation-wave-1.md`

## Optional Next Phases

- implement remediation wave 1:
  - strict bundle/proof semantic validation
  - explicit relay-source requirement for network actions
  - safer secret ingestion path
- productionize the operator CLI:
  - packaging
  - config and secrets posture
  - logging and audit output
  - release/version discipline
- expand fixture and relay coverage:
  - more adversarial Path A / Path C matrices
  - stronger relay-failure rehearsal
  - more proof artifact variants
- re-enter browser work only if explicitly chosen:
  - treat the browser as a thin operator view over the hardened CLI/bundle lane
  - do not reintroduce browser-first protocol logic

## Near-Term Rule

- start from the CLI/helper lane by default
- treat archived demo/browser packets as historical context, not active guidance
- do not reopen browser-first or demo-first design without a new explicit slice
