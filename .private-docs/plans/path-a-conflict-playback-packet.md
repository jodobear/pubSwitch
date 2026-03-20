---
title: Path A Conflict Playback Packet
doc_type: packet
status: completed
owner: tack
phase: p4-path-a-conflict-playback
canonical: false
---

# Path A Conflict Playback Packet

Completed slice 3 of the Path A conflict-playback loop.

## Purpose

- make root and child conflicts visible and understandable in the Path A demo workspace
- keep helper-derived facts clearly separate from protocol conflict state
- improve demoability without broad UI redesign

## Scope Delta

In scope:

- Path A conflict playback and provenance in the existing demo lane
- explicit conflict notes for root and child scenarios
- focused demo verification for the new scenarios

Out of scope:

- new UI lanes
- Path C changes
- recovery bundle redesign
- protocol wire changes

## Frozen Assumptions

- root conflicts remain authority-plural, not authority-singular
- helper panels must not imply confirmed authority coverage when the protocol state is conflicted
- the existing Path A workspace remains the only presentation surface for these scenarios

## Closeout Conditions

- root and child conflict fixtures render coherently in the Path A workspace
- provenance and helper cards do not overstate authority coverage
- any UI ambiguity is recorded explicitly

## Closeout

- the Path A demo now renders root and child conflict scenarios with explicit plural-authority
  helper status
- helper limits and provenance cards now explain why the helper does not claim one authority in
  plural conflicts
- browser smoke passed for both new conflict scenarios; the only console noise remained the missing
  `favicon.ico`
