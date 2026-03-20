---
title: PoC Bootstrap Packet
doc_type: packet
status: active
owner: tack
phase: p0-bootstrap
canonical: true
---

# PoC Bootstrap Packet

Current active packet for bootstrapping the `tack` PoC repo.

## Purpose

- critically evaluate the proposal docs
- freeze a fast-PoC implementation direction
- create a lean process surface
- scaffold the repo for immediate implementation

## Scope Delta

In scope:

- repo control docs
- proposal/research synthesis
- workspace/package scaffold
- initial shared helpers and first tests

Out of scope:

- final standards polish
- deep cryptographic audit
- production UX
- full relay/network hardening

## Critical Findings

- Path A is conceptually strong, but PMA enrollment/liveness and PMU duplicate normalization need
  careful handling
- Path C is viable for a PoC, but its social-evidence model must remain clearly secondary to Path A
- NIP-03 OTS anchoring is useful, but real-world stamping latency means the demo needs explicit
  pending states and fixture support
- applesauce is a strong app-layer fit for a focused demo client

## Closeout Conditions

- repo has a working startup path
- repo has a documented fast-PoC gate
- repo has a workspace scaffold aligned with the chosen stack
- protocol critique and research findings are written down
- next implementation slice is explicit in `handoff.md`

