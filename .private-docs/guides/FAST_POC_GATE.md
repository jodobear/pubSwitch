---
title: Fast PoC Gate
doc_type: policy
status: active
owner: tack
canonical: true
---

# Fast PoC Gate

Staged execution order for fast PoC work.

This is intentionally lighter than `noztr`:

- no exhaustive multi-angle audit before every slice
- no production-level closure burden
- yes to explicit scope, tests/fixtures, and honest handoff state

## Gate Order

1. Freeze the slice
   - what demo value does it unlock
   - what is out of scope
   - what protocol assumptions are being frozen for this slice

2. Implement the narrow path
   - prefer pure protocol packages
   - keep app glue thin
   - avoid speculative features

3. Correctness review
   - does the behavior match the draft and the frozen assumptions
   - are errors or invalid states surfaced clearly enough for a PoC

4. Demoability review
   - is the result easy to show
   - does it expose evidence or resolver output clearly
   - is there a happy path and one failure or ambiguity path

5. Evidence
   - add at least one test or one deterministic fixture
   - if a protocol rule is still unclear, record it explicitly

6. Light gates
   - `bun run typecheck`
   - touched tests or `bun test`
   - manual smoke if UI changed

7. Closeout
   - update packet/build-plan/handoff state
   - record unresolved protocol concerns instead of hiding them

## Stop Conditions

- the slice needs a protocol-shape decision that is not frozen yet
- the slice would entangle Path A and Path C logic
- the slice would create demo complexity without increasing protocol signal

