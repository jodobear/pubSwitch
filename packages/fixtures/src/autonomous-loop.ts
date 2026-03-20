export type AutonomousLoopSlice = {
  id: string;
  title: string;
  packetPath: string;
  confidence: "very_high";
  focus: string;
  editTargets: string[];
  inScope: string[];
  outOfScope: string[];
  acceptance: string[];
  docUpdates: string[];
  focusedVerification: string[];
  stopIf: string[];
  gates: string[];
};

export type AutonomousLoopPlan = {
  id: string;
  title: string;
  lane:
    | "path-a-demo-evidence"
    | "path-a-conflict-state"
    | "verification-credibility"
    | "path-a-conflict-playback"
    | "path-a-real-ots-corpus"
    | "path-a-real-ots-bridge"
    | "path-a-real-ots-adoption"
    | "path-a-real-ots-chain-root";
  confidence: "very_high";
  mode: "executor_facing_implementation_loop";
  rationale: string;
  executorContract: string;
  currentPacketPath: string;
  loopDocPath: string;
  stopConditions: string[];
  slices: AutonomousLoopSlice[];
};

const LIGHT_GATES = [
  "bun run typecheck",
  "bun test",
  "manual smoke for UI changes",
] as const;

const PROOF_EVIDENCE_STOP_IF = [
  "the slice requires changing PMA, PMU, PMX, STC, or STA wire behavior",
  "the slice requires full .ots byte parsing or independent Bitcoin verification",
  "the slice needs Path C behavior changes instead of keeping Path C separate",
  "the slice needs relay orchestration or background helper processes",
] as const;

const CONFLICT_STATE_STOP_IF = [
  "the slice starts redesigning the broader Path A resolver instead of adding narrow structured conflict metadata",
  "the slice requires Path C changes or cross-lane state merging",
  "the slice requires full .ots byte parsing or Bitcoin verification changes",
  "the slice needs relay orchestration, background helpers, or adapter-layer rewrites",
] as const;

const VERIFICATION_CREDIBILITY_STOP_IF = [
  "the slice requires full .ots byte parsing, Bitcoin attestation verification, or remote calendar orchestration",
  "the slice requires changing PMA, PMU, PMX, STC, or STA wire behavior",
  "the slice merges Path A and Path C logic instead of keeping them independent",
  "the slice expands into broad demo-client redesign instead of narrow verification work",
] as const;

const CONFLICT_PLAYBACK_STOP_IF = [
  "the slice starts redesigning the broader Path A resolver instead of adding narrow conflict fixtures or playback",
  "the slice requires Path C changes or cross-lane state merging",
  "the slice requires full .ots byte parsing or Bitcoin verification changes",
  "the slice expands into broad demo-client redesign beyond the existing Path A workspace",
] as const;

const REAL_OTS_CORPUS_STOP_IF = [
  "the slice requires bundling opentimestamps or other Node-oriented verification code into the browser demo",
  "the slice requires remote calendar orchestration or network-dependent proof minting as part of the deterministic corpus",
  "the slice requires changing PMA, PMU, PMX, STC, or STA wire behavior",
  "the slice requires Path C changes, cross-lane state merging, or independent Bitcoin header verification",
] as const;

const REAL_OTS_BRIDGE_STOP_IF = [
  "the slice requires bundling opentimestamps or other Node-oriented verification code into the browser demo",
  "the slice requires remote calendar orchestration or network-dependent proof minting",
  "the slice requires changing PMA, PMU, PMX, STC, or STA wire behavior",
  "the slice requires Path C changes, cross-lane state merging, or independent Bitcoin header verification",
] as const;

const REAL_OTS_ADOPTION_STOP_IF = [
  "the slice requires bundling opentimestamps or other Node-oriented verification code into the browser demo",
  "the slice requires remote calendar orchestration or new proof minting",
  "the slice requires changing PMA, PMU, PMX, STC, or STA wire behavior",
  "the slice requires Path C changes, cross-lane state merging, or broad replacement of all placeholder proof paths at once",
] as const;

const REAL_OTS_CHAIN_ROOT_STOP_IF = [
  "the slice requires minting new real PMU or PMX .ots proofs instead of reusing the shared real confirmed PMA root",
  "the slice requires bundling opentimestamps or other Node-oriented verification code into the browser demo",
  "the slice requires changing PMA, PMU, PMX, STC, or STA wire behavior",
  "the slice requires Path C changes, cross-lane state merging, or broad replacement of all remaining placeholder proof paths at once",
] as const;

export function getProofEvidenceAutonomousLoop(): AutonomousLoopPlan {
  return {
    id: "path-a-proof-evidence-loop",
    title: "Path A Proof Evidence Loop",
    lane: "path-a-demo-evidence",
    confidence: "very_high",
    mode: "executor_facing_implementation_loop",
    rationale:
      "These slices stay inside one narrow demo lane, reuse deterministic fixtures, and avoid protocol-direction changes. Each slice can close with the existing light gates and explicit stop conditions.",
    executorContract:
      "Execute the slices in order without interruption unless a hard stop triggers. After each slice, run the listed gates, update the packet and control docs honestly, then continue to the next queued slice.",
    currentPacketPath: ".private-docs/plans/ots-helper-demo-evidence-packet.md",
    loopDocPath: ".private-docs/plans/path-a-proof-evidence-loop.md",
    stopConditions: [...PROOF_EVIDENCE_STOP_IF],
    slices: [
      {
        id: "helper-posture-panel",
        title: "Helper-backed Path A posture panel",
        packetPath: ".private-docs/plans/ots-helper-demo-evidence-packet.md",
        confidence: "very_high",
        focus:
          "Show helper-backed Path A proof posture in the demo without merging it into protocol truth.",
        editTargets: [
          "apps/demo-client/src/App.tsx",
          "apps/demo-client/src/styles.css",
        ],
        inScope: [
          "Path A demo workspace",
          "helper-backed proof bridge output",
          "focused UI verification",
        ],
        outOfScope: [
          "protocol package changes",
          "Path C changes",
          "raw .ots parsing",
        ],
        acceptance: [
          "the Path A demo lane shows helper-backed proof posture for every fixture scenario",
          "helper status is visibly separate from raw resolver output and raw 1040 events",
          "pending, confirmed, and helper-error states are distinct in the UI",
        ],
        docUpdates: [
          "close or update .private-docs/plans/ots-helper-demo-evidence-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun run build:demo",
          "manual browser smoke of the Path A helper posture panel",
        ],
        stopIf: [...PROOF_EVIDENCE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "proof-inspection-list",
        title: "Per-proof helper inspection list",
        packetPath: ".private-docs/plans/ots-helper-demo-proof-list-packet.md",
        confidence: "very_high",
        focus:
          "Render each helper-inspected proof with status and target event details in a separate demo panel.",
        editTargets: [
          "apps/demo-client/src/App.tsx",
          "apps/demo-client/src/styles.css",
          "apps/ots-helper/src/inspect.ts",
        ],
        inScope: [
          "demo-client proof-inspection panel",
          "reuse of helper inspection output",
          "fixture-backed UI states",
        ],
        outOfScope: [
          "new proof semantics",
          "protocol resolver changes",
          "Path C changes",
        ],
        acceptance: [
          "each Path A proof event appears in a helper-inspection list with proof id and target id",
          "invalid helper inspection results are shown separately from valid proof rows",
          "the raw 1040 proof JSON panel remains intact and separate",
        ],
        docUpdates: [
          "close or update .private-docs/plans/ots-helper-demo-proof-list-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun run build:demo",
          "manual browser smoke across pending and confirmed Path A scenarios",
        ],
        stopIf: [...PROOF_EVIDENCE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "proof-provenance-disclosure",
        title: "Proof provenance disclosure",
        packetPath: ".private-docs/plans/ots-helper-demo-provenance-packet.md",
        confidence: "very_high",
        focus:
          "Label protocol-derived, helper-derived, and app-derived facts explicitly in the demo evidence workspace.",
        editTargets: [
          "apps/demo-client/src/App.tsx",
          "apps/demo-client/src/styles.css",
        ],
        inScope: [
          "copy and badges in the Path A demo lane",
          "explicit helper-mediated disclosure",
          "focused smoke verification",
        ],
        outOfScope: [
          "new authority semantics",
          "recovery bundle redesign",
          "Path C changes",
        ],
        acceptance: [
          "the Path A workspace explicitly labels protocol-derived versus helper-derived facts",
          "app-layer recovery or presentation facts remain labeled as app-layer facts",
          "no Path C copy or styling is changed as part of this slice",
        ],
        docUpdates: [
          "close or update .private-docs/plans/ots-helper-demo-provenance-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun run build:demo",
          "manual browser smoke of provenance labels in the Path A workspace",
        ],
        stopIf: [...PROOF_EVIDENCE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "demo-script-parity",
        title: "Demo and script proof-status parity",
        packetPath: ".private-docs/plans/ots-helper-demo-parity-packet.md",
        confidence: "very_high",
        focus:
          "Keep the demo wording and helper summary states aligned with the verification script output.",
        editTargets: [
          "apps/demo-client/src/App.tsx",
          "scripts/verify-scenario.ts",
          "apps/ots-helper/src/path-a-proof-bridge.ts",
        ],
        inScope: [
          "demo copy alignment",
          "script summary wording alignment",
          "focused deterministic verification",
        ],
        outOfScope: [
          "protocol behavior changes",
          "new fixture families",
          "broad process changes",
        ],
        acceptance: [
          "helper status names shown in the demo match the script-facing summary states",
          "the verification script output remains deterministic after the alignment change",
          "wording drift is reduced without changing resolver behavior",
        ],
        docUpdates: [
          "close or update .private-docs/plans/ots-helper-demo-parity-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun scripts/verify-scenario.ts",
          "bun run build:demo",
        ],
        stopIf: [...PROOF_EVIDENCE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
    ],
  };
}

export function getPathARealOtsCorpusAutonomousLoop(): AutonomousLoopPlan {
  return {
    id: "path-a-real-ots-corpus-loop",
    title: "Path A Real OTS Corpus Loop",
    lane: "path-a-real-ots-corpus",
    confidence: "very_high",
    mode: "executor_facing_implementation_loop",
    rationale:
      "These slices stay inside one helper-side Path A corpus lane, avoid browser bundling, and use deterministic locally serialized .ots proof bytes. Each slice can close with tests or script verification instead of network orchestration.",
    executorContract:
      "Execute the slices in order without interruption unless a hard stop triggers. After each slice, run the listed gates, update the packet and control docs honestly, then continue to the next queued slice.",
    currentPacketPath: ".private-docs/plans/path-a-real-ots-corpus-packet.md",
    loopDocPath: ".private-docs/plans/path-a-real-ots-corpus-loop.md",
    stopConditions: [...REAL_OTS_CORPUS_STOP_IF],
    slices: [
      {
        id: "real-pma-corpus",
        title: "Deterministic real PMA corpus",
        packetPath: ".private-docs/plans/path-a-real-ots-corpus-packet.md",
        confidence: "very_high",
        focus:
          "Create one deterministic helper-side corpus of real PMA events, canonical preimages, and real serialized .ots proof bytes.",
        editTargets: [
          "apps/ots-helper/src/path-a-real-corpus.ts",
          "apps/ots-helper/src/__tests__/path-a-real-corpus.test.ts",
        ],
        inScope: [
          "real PMA event ids",
          "real serialized .ots bytes",
          "deterministic helper-side corpus",
        ],
        outOfScope: [
          "browser demo bundling",
          "remote calendar orchestration",
          "protocol resolver changes",
        ],
        acceptance: [
          "at least one real Path A corpus item exists with a real PMA event and real serialized .ots proof bytes",
          "the corpus stores the canonical Nostr preimage used to explain the event-id binding",
          "the corpus is deterministic and test-backed",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-corpus-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test apps/ots-helper/src/__tests__/path-a-real-corpus.test.ts",
        ],
        stopIf: [...REAL_OTS_CORPUS_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "helper-corpus-cli",
        title: "Helper corpus CLI",
        packetPath: ".private-docs/plans/path-a-real-ots-helper-packet.md",
        confidence: "very_high",
        focus:
          "Expose the deterministic real corpus through helper-side inspection commands without changing the browser path.",
        editTargets: [
          "apps/ots-helper/src/index.ts",
          "apps/ots-helper/src/path-a-real-corpus.ts",
        ],
        inScope: [
          "helper-side corpus inspection",
          "CLI access",
          "deterministic local summaries",
        ],
        outOfScope: [
          "browser demo changes",
          "Path C changes",
          "remote proof minting",
        ],
        acceptance: [
          "the helper CLI can list or inspect the real Path A corpus",
          "helper output includes proof verification results for the corpus",
          "the corpus stays helper-only and browser-safe boundaries remain intact",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-helper-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun run --cwd apps/ots-helper start inspect-corpus real-pma-pending",
        ],
        stopIf: [...REAL_OTS_CORPUS_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "corpus-script-parity",
        title: "Corpus script parity",
        packetPath: ".private-docs/plans/path-a-real-ots-script-parity-packet.md",
        confidence: "very_high",
        focus:
          "Provide one deterministic script surface that rechecks preimage binding and helper verification for the real corpus.",
        editTargets: [
          "scripts/verify-real-ots-corpus.ts",
          "package.json",
        ],
        inScope: [
          "script parity",
          "helper verification parity",
          "deterministic terminal output",
        ],
        outOfScope: [
          "browser demo integration",
          "remote services",
          "protocol changes",
        ],
        acceptance: [
          "one script verifies every real corpus item end to end",
          "the script fails on helper mismatches or preimage mismatches",
          "the root package exposes the script through a bun command",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-script-parity-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun run verify:real-ots-corpus",
        ],
        stopIf: [...REAL_OTS_CORPUS_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "doc-closeout",
        title: "Real corpus doc closeout",
        packetPath: ".private-docs/plans/path-a-real-ots-doc-parity-packet.md",
        confidence: "very_high",
        focus:
          "Record what the deterministic real corpus now proves and hand off to the next bounded helper-side bridge slice.",
        editTargets: [
          "handoff.md",
          ".private-docs/plans/build-plan.md",
          ".private-docs/README.md",
          "AGENTS.md",
          "agent-brief",
        ],
        inScope: [
          "control-doc parity",
          "explicit deferred notes",
          "next-packet handoff",
        ],
        outOfScope: [
          "new protocol code",
          "browser redesign",
          "Bitcoin node verification",
        ],
        acceptance: [
          "control docs reflect the completed corpus lane and the next active packet",
          "deferred OTS limits are stated explicitly",
          "the active autonomous loop is no longer shown as queued after closeout",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-doc-parity-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
          "update .private-docs/README.md",
        ],
        focusedVerification: [
          "bun run show:autonomous-loop --current",
        ],
        stopIf: [...REAL_OTS_CORPUS_STOP_IF],
        gates: [...LIGHT_GATES],
      },
    ],
  };
}

export function getPathARealOtsBridgeAutonomousLoop(): AutonomousLoopPlan {
  return {
    id: "path-a-real-ots-bridge-loop",
    title: "Path A Real OTS Bridge Loop",
    lane: "path-a-real-ots-bridge",
    confidence: "very_high",
    mode: "executor_facing_implementation_loop",
    rationale:
      "These slices stay in one narrow bridge lane: pure deterministic real corpus data, helper parity, and a browser-safe demo surface. The loop avoids browser bundling of opentimestamps and keeps the trust model explicit.",
    executorContract:
      "Execute the slices in order without interruption unless a hard stop triggers. After each slice, run the listed gates, update the packet and control docs honestly, then continue to the next queued slice.",
    currentPacketPath: ".private-docs/plans/path-a-real-ots-bridge-packet.md",
    loopDocPath: ".private-docs/plans/path-a-real-ots-bridge-loop.md",
    stopConditions: [...REAL_OTS_BRIDGE_STOP_IF],
    slices: [
      {
        id: "pure-real-corpus-bridge",
        title: "Pure real corpus bridge",
        packetPath: ".private-docs/plans/path-a-real-ots-bridge-packet.md",
        confidence: "very_high",
        focus:
          "Split the deterministic real corpus into a pure browser-safe data source while keeping helper verification layered on top.",
        editTargets: [
          "packages/fixtures/src/path-a-real-ots.ts",
          "apps/ots-helper/src/path-a-real-corpus.ts",
          "packages/fixtures/src/__tests__/path-a-real-ots.test.ts",
        ],
        inScope: [
          "pure deterministic corpus data",
          "helper parity on top of shared data",
          "browser-safe imports",
        ],
        outOfScope: [
          "browser-side .ots parsing",
          "remote calendar orchestration",
          "protocol changes",
        ],
        acceptance: [
          "the real Path A corpus can be imported without bringing opentimestamps into browser code",
          "helper inspection still passes on the shared corpus data",
          "the corpus stays deterministic and test-backed",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-bridge-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test packages/fixtures/src/__tests__/path-a-real-ots.test.ts",
        ],
        stopIf: [...REAL_OTS_BRIDGE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "demo-real-corpus-snapshot",
        title: "Demo real corpus snapshot",
        packetPath: ".private-docs/plans/path-a-real-ots-demo-packet.md",
        confidence: "very_high",
        focus:
          "Show the real helper-verified corpus in the Path A demo as a separate browser-safe snapshot lane.",
        editTargets: [
          "apps/demo-client/src/path-a-real-ots-view.ts",
          "apps/demo-client/src/path-a-proof-view.ts",
          "apps/demo-client/src/App.tsx",
          "apps/demo-client/src/styles.css",
        ],
        inScope: [
          "Path A demo workspace",
          "explicit provenance copy",
          "focused browser smoke",
        ],
        outOfScope: [
          "browser-side verifier imports",
          "Path C changes",
          "protocol resolver changes",
        ],
        acceptance: [
          "the Path A demo shows the real corpus snapshot in a separate panel",
          "the panel labels the data as a browser-safe mirror of helper-side verification",
          "the fixture-scenario path and the real-corpus path remain visibly separate",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-demo-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun run build:demo",
          "manual browser smoke of the Path A real corpus panel",
        ],
        stopIf: [...REAL_OTS_BRIDGE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "cli-script-parity",
        title: "CLI and script parity",
        packetPath: ".private-docs/plans/path-a-real-ots-cli-parity-packet.md",
        confidence: "very_high",
        focus:
          "Keep helper CLI and verification script surfaces aligned to the shared pure corpus data.",
        editTargets: [
          "apps/ots-helper/src/index.ts",
          "scripts/verify-real-ots-corpus.ts",
          "apps/ots-helper/src/__tests__/path-a-real-corpus.test.ts",
        ],
        inScope: [
          "CLI parity",
          "verification script parity",
          "deterministic tests",
        ],
        outOfScope: [
          "new protocol semantics",
          "browser bundling of the verifier",
          "Path C changes",
        ],
        acceptance: [
          "CLI and script surfaces both consume the shared pure corpus data",
          "parity failures are detectable in deterministic tests or script output",
          "the helper-side verification layer stays distinct from browser-safe data",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-cli-parity-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun run verify:real-ots-corpus",
          "bun run --cwd apps/ots-helper start inspect-corpus real-pma-pending",
        ],
        stopIf: [...REAL_OTS_BRIDGE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "bridge-doc-closeout",
        title: "Bridge doc closeout",
        packetPath: ".private-docs/plans/path-a-real-ots-bridge-doc-packet.md",
        confidence: "very_high",
        focus:
          "Record the new browser-safe bridge posture honestly and hand off to the next bounded replacement slice.",
        editTargets: [
          "handoff.md",
          ".private-docs/plans/build-plan.md",
          ".private-docs/README.md",
          "AGENTS.md",
          "agent-brief",
        ],
        inScope: [
          "control-doc parity",
          "deferred notes",
          "next-packet handoff",
        ],
        outOfScope: [
          "new protocol behavior",
          "remote orchestration",
          "Bitcoin node verification",
        ],
        acceptance: [
          "control docs reflect the completed bridge lane and the next active packet",
          "the browser-safe mirror limits are stated explicitly",
          "the active autonomous loop is no longer shown as queued after closeout",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-bridge-doc-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
          "update .private-docs/README.md",
        ],
        focusedVerification: [
          "bun run show:autonomous-loop --current",
        ],
        stopIf: [...REAL_OTS_BRIDGE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
    ],
  };
}

export function getPathARealOtsAdoptionAutonomousLoop(): AutonomousLoopPlan {
  return {
    id: "path-a-real-ots-adoption-loop",
    title: "Path A Real OTS Adoption Loop",
    lane: "path-a-real-ots-adoption",
    confidence: "very_high",
    mode: "executor_facing_implementation_loop",
    rationale:
      "These slices stay in one narrow adoption lane: swap the main pending scenario to shared real proof data, add one real confirmed scenario, then label proof backing across demo and script surfaces. The loop avoids protocol changes and browser-side verifier imports.",
    executorContract:
      "Execute the slices in order without interruption unless a hard stop triggers. After each slice, run the listed gates, update the packet and control docs honestly, then continue to the next queued slice.",
    currentPacketPath: ".private-docs/plans/path-a-real-ots-scenario-replacement-packet.md",
    loopDocPath: ".private-docs/plans/path-a-real-ots-adoption-loop.md",
    stopConditions: [...REAL_OTS_ADOPTION_STOP_IF],
    slices: [
      {
        id: "pending-real-replacement",
        title: "Pending scenario real replacement",
        packetPath: ".private-docs/plans/path-a-real-ots-scenario-replacement-packet.md",
        confidence: "very_high",
        focus:
          "Replace the pending Path A placeholder proof path with the shared real pending corpus item.",
        editTargets: [
          "packages/fixtures/src/index.ts",
          "packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
        ],
        inScope: [
          "pending Path A fixture",
          "shared real corpus reuse",
          "deterministic fixture verification",
        ],
        outOfScope: [
          "new proof minting",
          "Path C changes",
          "protocol changes",
        ],
        acceptance: [
          "the pending Path A scenario now uses the shared real pending corpus event and proof",
          "resolver behavior for pending authority remains unchanged",
          "the fixture suite remains deterministic",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-scenario-replacement-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
        ],
        stopIf: [...REAL_OTS_ADOPTION_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "real-confirmed-scenario",
        title: "Real confirmed PMA scenario",
        packetPath: ".private-docs/plans/path-a-real-ots-confirmed-scenario-packet.md",
        confidence: "very_high",
        focus:
          "Add one simple confirmed Path A PMA scenario backed by the shared real confirmed corpus item.",
        editTargets: [
          "packages/fixtures/src/index.ts",
          "packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
        ],
        inScope: [
          "one real confirmed Path A scenario",
          "main scenario list ordering",
          "deterministic tests",
        ],
        outOfScope: [
          "PMU/PMX real-proof adoption",
          "Path C changes",
          "protocol changes",
        ],
        acceptance: [
          "the main Path A scenario list includes a real confirmed PMA scenario",
          "the scenario resolves to bitcoin_confirmed from shared real corpus data",
          "the fixture suite stays deterministic",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-confirmed-scenario-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun scripts/verify-scenario.ts real-confirmed-pma",
        ],
        stopIf: [...REAL_OTS_ADOPTION_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "proof-backing-parity",
        title: "Proof-backing parity",
        packetPath: ".private-docs/plans/path-a-real-ots-parity-packet.md",
        confidence: "very_high",
        focus:
          "Label real-backed versus placeholder-backed Path A scenarios across demo and script surfaces.",
        editTargets: [
          "apps/demo-client/src/App.tsx",
          "apps/demo-client/src/styles.css",
          "scripts/verify-scenario.ts",
          "scripts/publish-scenario.ts",
        ],
        inScope: [
          "Path A demo labels",
          "script output labels",
          "browser smoke for the updated Path A lane",
        ],
        outOfScope: [
          "browser-side .ots parsing",
          "Path C UI changes",
          "protocol changes",
        ],
        acceptance: [
          "Path A scenarios visibly indicate whether proof backing is real helper-verified or placeholder metadata",
          "verify-scenario and publish-scenario output expose the same distinction",
          "the updated Path A workspace still reads clearly in the browser",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-parity-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun run build:demo",
          "manual browser smoke of the Path A scenario list and detail panel",
        ],
        stopIf: [...REAL_OTS_ADOPTION_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "adoption-doc-closeout",
        title: "Adoption doc closeout",
        packetPath: ".private-docs/plans/path-a-real-ots-adoption-doc-packet.md",
        confidence: "very_high",
        focus:
          "Record which main Path A scenarios are now real-backed and hand off to the next minimal adoption slice.",
        editTargets: [
          "handoff.md",
          ".private-docs/plans/build-plan.md",
          ".private-docs/README.md",
          "AGENTS.md",
          "agent-brief",
        ],
        inScope: [
          "control-doc parity",
          "explicit remaining placeholder notes",
          "next-packet handoff",
        ],
        outOfScope: [
          "new protocol behavior",
          "remote proof minting",
          "broad fixture redesign",
        ],
        acceptance: [
          "control docs reflect the completed adoption lane and the next active packet",
          "remaining placeholder-backed Path A scenarios are stated explicitly",
          "the active autonomous loop is no longer shown as queued after closeout",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-adoption-doc-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
          "update .private-docs/README.md",
        ],
        focusedVerification: [
          "bun run show:autonomous-loop --current",
        ],
        stopIf: [...REAL_OTS_ADOPTION_STOP_IF],
        gates: [...LIGHT_GATES],
      },
    ],
  };
}

export function getPathARealOtsChainRootAutonomousLoop(): AutonomousLoopPlan {
  return {
    id: "path-a-real-ots-chain-root-loop",
    title: "Path A Real OTS Chain Root Loop",
    lane: "path-a-real-ots-chain-root",
    confidence: "very_high",
    mode: "executor_facing_implementation_loop",
    rationale:
      "These slices stay in one narrow single-root authority-chain lane: reuse the shared real confirmed PMA root across confirmed, child-conflict, and execution-family scenarios, then make mixed proof backing explicit without minting new downstream proofs.",
    executorContract:
      "Execute the slices in order without interruption unless a hard stop triggers. After each slice, run the listed gates, update the packet and control docs honestly, then continue to the next queued slice.",
    currentPacketPath: ".private-docs/plans/path-a-real-ots-chain-root-packet.md",
    loopDocPath: ".private-docs/plans/path-a-real-ots-chain-root-loop.md",
    stopConditions: [...REAL_OTS_CHAIN_ROOT_STOP_IF],
    slices: [
      {
        id: "confirmed-authority-root-adoption",
        title: "Confirmed-authority real root adoption",
        packetPath: ".private-docs/plans/path-a-real-ots-chain-root-packet.md",
        confidence: "very_high",
        focus:
          "Reuse the shared real confirmed PMA root in the confirmed-authority scenario while keeping downstream PMU proof backing explicit.",
        editTargets: [
          "packages/fixtures/src/index.ts",
          "packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
          "scripts/verify-scenario.ts",
        ],
        inScope: [
          "confirmed-authority fixture",
          "shared real confirmed root reuse",
          "deterministic fixture and script checks",
        ],
        outOfScope: [
          "real PMU proof minting",
          "Path C changes",
          "protocol changes",
        ],
        acceptance: [
          "the confirmed-authority scenario reuses the shared real confirmed PMA root",
          "resolver behavior for confirmed-authority remains unchanged",
          "mixed proof backing is explicit where the real root pairs with placeholder PMU proofs",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-chain-root-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
          "bun scripts/verify-scenario.ts confirmed-authority",
        ],
        stopIf: [...REAL_OTS_CHAIN_ROOT_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "child-conflict-root-adoption",
        title: "Child-conflict real root adoption",
        packetPath: ".private-docs/plans/path-a-real-ots-chain-conflict-packet.md",
        confidence: "very_high",
        focus:
          "Reuse the shared real confirmed PMA root in the conflicting-children scenario without changing plural-child conflict behavior.",
        editTargets: [
          "packages/fixtures/src/index.ts",
          "packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
          "apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts",
        ],
        inScope: [
          "conflicting-children fixture",
          "helper parity for plural-child conflicts",
          "mixed proof-backing metadata",
        ],
        outOfScope: [
          "multiple_roots redesign",
          "real PMU proof minting",
          "Path C changes",
        ],
        acceptance: [
          "the conflicting-children scenario reuses the shared real confirmed PMA root",
          "plural-child conflict semantics stay unchanged",
          "helper-facing coverage remains explicit that one active child authority is not chosen",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-chain-conflict-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
          "bun test apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts",
          "bun scripts/verify-scenario.ts conflicting-children",
        ],
        stopIf: [...REAL_OTS_CHAIN_ROOT_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "execution-family-root-adoption",
        title: "Execution-family real root adoption",
        packetPath: ".private-docs/plans/path-a-real-ots-chain-execution-packet.md",
        confidence: "very_high",
        focus:
          "Reuse the shared real confirmed PMA root in executed-happy-path and conflicting-executions while leaving downstream PMU and PMX proof material placeholder-backed.",
        editTargets: [
          "packages/fixtures/src/index.ts",
          "packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
          "scripts/verify-scenario.ts",
        ],
        inScope: [
          "executed-happy-path fixture",
          "conflicting-executions fixture",
          "deterministic script parity",
        ],
        outOfScope: [
          "real PMU or PMX proof minting",
          "Path C changes",
          "protocol changes",
        ],
        acceptance: [
          "the execution-family scenarios reuse the shared real confirmed PMA root",
          "expected executed and multiple_executions resolver outcomes stay unchanged",
          "mixed proof backing is explicit anywhere downstream proofs remain placeholder-backed",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-chain-execution-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
          "bun scripts/verify-scenario.ts executed-happy-path",
          "bun scripts/verify-scenario.ts conflicting-executions",
        ],
        stopIf: [...REAL_OTS_CHAIN_ROOT_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "mixed-backing-parity-closeout",
        title: "Mixed-backing parity and closeout",
        packetPath: ".private-docs/plans/path-a-real-ots-chain-parity-packet.md",
        confidence: "very_high",
        focus:
          "Keep demo, publish, verify, and control docs aligned once single-root authority-chain scenarios become mixed-backed.",
        editTargets: [
          "apps/demo-client/src/App.tsx",
          "apps/demo-client/src/styles.css",
          "scripts/verify-scenario.ts",
          "scripts/publish-scenario.ts",
          "handoff.md",
          ".private-docs/plans/build-plan.md",
          ".private-docs/README.md",
        ],
        inScope: [
          "mixed proof-backing copy",
          "control-doc closeout",
          "focused browser smoke if UI copy changes",
        ],
        outOfScope: [
          "new protocol behavior",
          "new proof minting",
          "Path C changes",
        ],
        acceptance: [
          "demo and script surfaces distinguish fully real-backed, mixed-backed, and placeholder-backed Path A scenarios if needed",
          "control docs reflect the completed chain-root lane and the next active packet",
          "the active autonomous loop can stop cleanly after parity is locked",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-real-ots-chain-parity-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
          "update .private-docs/README.md",
        ],
        focusedVerification: [
          "bun run build:demo",
          "bun scripts/verify-scenario.ts",
          "manual browser smoke of the Path A scenario list and detail panel",
        ],
        stopIf: [...REAL_OTS_CHAIN_ROOT_STOP_IF],
        gates: [...LIGHT_GATES],
      },
    ],
  };
}

export function getPathAConflictStateAutonomousLoop(): AutonomousLoopPlan {
  return {
    id: "path-a-conflict-state-loop",
    title: "Path A Conflict State Loop",
    lane: "path-a-conflict-state",
    confidence: "very_high",
    mode: "executor_facing_implementation_loop",
    rationale:
      "These slices stay within one narrow Path A state-shape lane: add structured conflict metadata, migrate immediate helper and demo consumers, and lock deterministic parity without reopening protocol direction.",
    executorContract:
      "Execute the slices in order without interruption unless a hard stop triggers. After each slice, run the listed gates, update the packet and control docs honestly, then continue to the next queued slice.",
    currentPacketPath: ".private-docs/plans/path-a-conflict-structure-packet.md",
    loopDocPath: ".private-docs/plans/path-a-conflict-state-loop.md",
    stopConditions: [...CONFLICT_STATE_STOP_IF],
    slices: [
      {
        id: "conflict-structure",
        title: "Structured Path A conflict metadata",
        packetPath: ".private-docs/plans/path-a-conflict-structure-packet.md",
        confidence: "very_high",
        focus:
          "Add narrow structured metadata to relevant Path A conflict states so authority coverage no longer depends on reason-text parsing.",
        editTargets: [
          "packages/protocol-a/src/index.ts",
          "packages/protocol-a/src/__tests__/protocol-a.test.ts",
          "packages/fixtures/src/index.ts",
          "packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
        ],
        inScope: [
          "PreparedMigrationState conflict shape",
          "protocol-a resolver return values",
          "fixture-backed conflict expectations",
        ],
        outOfScope: [
          "broader resolver redesign",
          "Path C changes",
          "real .ots parsing",
        ],
        acceptance: [
          "relevant Path A conflict states expose structured authority metadata",
          "existing conflict meaning and fixture behavior stay intact apart from the new structured field",
          "protocol-a tests cover the new conflict structure",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-conflict-structure-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test packages/protocol-a/src/__tests__/protocol-a.test.ts",
          "bun test packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
        ],
        stopIf: [...CONFLICT_STATE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "conflict-bridge-migration",
        title: "Helper bridge conflict migration",
        packetPath: ".private-docs/plans/path-a-conflict-bridge-packet.md",
        confidence: "very_high",
        focus:
          "Remove regex parsing from helper-facing conflict handling and consume the structured conflict field directly.",
        editTargets: [
          "apps/ots-helper/src/path-a-proof-bridge.ts",
          "apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts",
        ],
        inScope: [
          "helper conflict authority extraction",
          "helper bridge tests",
          "narrow consumer migration",
        ],
        outOfScope: [
          "new proof semantics",
          "demo redesign",
          "Path C changes",
        ],
        acceptance: [
          "the helper bridge no longer parses authority ids from free-form reason text",
          "bridge tests cover structured conflict metadata",
          "helper status semantics stay unchanged",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-conflict-bridge-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts",
          "bun scripts/verify-scenario.ts conflicting-executions",
        ],
        stopIf: [...CONFLICT_STATE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "conflict-demo-migration",
        title: "Demo conflict metadata migration",
        packetPath: ".private-docs/plans/path-a-conflict-demo-packet.md",
        confidence: "very_high",
        focus:
          "Update the Path A demo view model and presentation to consume structured conflict metadata directly.",
        editTargets: [
          "apps/demo-client/src/path-a-proof-view.ts",
          "apps/demo-client/src/App.tsx",
          "apps/demo-client/src/__tests__/path-a-proof-view.test.ts",
        ],
        inScope: [
          "Path A proof view model",
          "demo conflict authority display",
          "focused UI verification",
        ],
        outOfScope: [
          "new UI lanes",
          "Path C changes",
          "recovery bundle redesign",
        ],
        acceptance: [
          "the demo no longer relies on reason-text parsing for conflict authority display",
          "the conflict scenario still renders clearly in the Path A workspace",
          "view-model tests cover the structured conflict field",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-conflict-demo-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test apps/demo-client/src/__tests__/path-a-proof-view.test.ts",
          "bun run build:demo",
          "manual browser smoke of the conflicting-executions Path A scenario",
        ],
        stopIf: [...CONFLICT_STATE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "conflict-parity",
        title: "Conflict-state script and doc parity",
        packetPath: ".private-docs/plans/path-a-conflict-parity-packet.md",
        confidence: "very_high",
        focus:
          "Keep verification script output, fixtures, and control docs aligned with the new structured conflict metadata.",
        editTargets: [
          "scripts/verify-scenario.ts",
          "packages/fixtures/src/index.ts",
          "handoff.md",
          ".private-docs/plans/build-plan.md",
        ],
        inScope: [
          "script output wording for conflicts",
          "fixture expected-state parity",
          "control-doc alignment",
        ],
        outOfScope: [
          "broader protocol changes",
          "new fixture families",
          "Path C changes",
        ],
        acceptance: [
          "script output remains deterministic with the structured conflict field present",
          "fixture expectations and docs describe the same conflict shape",
          "the loop can stop cleanly after parity is locked",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-conflict-parity-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
          "update .private-docs/plans/path-a-conflict-state-loop.md",
        ],
        focusedVerification: [
          "bun scripts/verify-scenario.ts",
          "bun run typecheck",
        ],
        stopIf: [...CONFLICT_STATE_STOP_IF],
        gates: [...LIGHT_GATES],
      },
    ],
  };
}

export function getVerificationCredibilityAutonomousLoop(): AutonomousLoopPlan {
  return {
    id: "verification-credibility-loop",
    title: "Verification Credibility Loop",
    lane: "verification-credibility",
    confidence: "very_high",
    mode: "executor_facing_implementation_loop",
    rationale:
      "These slices stay inside one narrow verification lane: freeze the trust model, add shared Schnorr verification helpers, then wire them into Path A and Path C without reopening protocol direction or mixing in lower-confidence OTS parsing work.",
    executorContract:
      "Execute the slices in order without interruption unless a hard stop triggers. After each slice, run the listed gates, update the packet and control docs honestly, then continue to the next queued slice.",
    currentPacketPath: ".private-docs/plans/shared-schnorr-foundation-packet.md",
    loopDocPath: ".private-docs/plans/verification-credibility-loop.md",
    stopConditions: [...VERIFICATION_CREDIBILITY_STOP_IF],
    slices: [
      {
        id: "verification-foundation",
        title: "Verification trust-model foundation",
        packetPath: ".private-docs/plans/verification-foundation-packet.md",
        confidence: "very_high",
        focus:
          "Reflect the verification trust model into research, startup, and control docs before code-bearing verification slices start.",
        editTargets: [
          ".private-docs/research/proposal-and-research-review.md",
          "AGENTS.md",
          "handoff.md",
          ".private-docs/plans/build-plan.md",
        ],
        inScope: [
          "research posture",
          "startup and control-doc alignment",
          "explicit next-loop routing",
        ],
        outOfScope: [
          "protocol code changes",
          "real .ots parsing",
          "UI changes",
        ],
        acceptance: [
          "the verification trust model is explicit in the research and control docs",
          "the active packet and current loop references point to the verification lane",
          "the deferred conflict-fixtures slice remains recorded honestly",
        ],
        docUpdates: [
          "close or update .private-docs/plans/verification-foundation-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
          "update startup-control docs",
        ],
        focusedVerification: [
          "./agent-brief",
          "bun run show:autonomous-loop --current",
          "bun run show:autonomous-loop --current --prompt",
        ],
        stopIf: [...VERIFICATION_CREDIBILITY_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "shared-schnorr-foundation",
        title: "Shared Schnorr verification foundation",
        packetPath: ".private-docs/plans/shared-schnorr-foundation-packet.md",
        confidence: "very_high",
        focus:
          "Add pure shared Schnorr verification helpers and deterministic vectors before Path A and Path C adopt them.",
        editTargets: [
          "packages/protocol-shared/src/index.ts",
          "packages/protocol-shared/src/*.ts",
          "packages/protocol-shared/src/__tests__/*.test.ts",
        ],
        inScope: [
          "shared verification helpers",
          "deterministic vectors",
          "explicit verifier dependency wiring if needed",
        ],
        outOfScope: [
          "Path A resolver changes",
          "Path C resolver changes",
          "real .ots parsing",
        ],
        acceptance: [
          "shared Schnorr verification helpers exist with deterministic tests",
          "the helper surface is reusable by both protocol packages",
          "any verifier-library choice or limitation is recorded explicitly",
        ],
        docUpdates: [
          "close or update .private-docs/plans/shared-schnorr-foundation-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test packages/protocol-shared/src/__tests__",
          "bun run typecheck",
        ],
        stopIf: [...VERIFICATION_CREDIBILITY_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "path-a-schnorr-verification",
        title: "Path A real Schnorr verification",
        packetPath: ".private-docs/plans/path-a-schnorr-verification-packet.md",
        confidence: "very_high",
        focus:
          "Replace Path A event and detached signature shape checks with real verification using the shared helper.",
        editTargets: [
          "packages/protocol-a/src/index.ts",
          "packages/protocol-a/src/__tests__/protocol-a.test.ts",
        ],
        inScope: [
          "PMA event-signature verification",
          "PMU and PMX detached-signature verification",
          "deterministic valid and invalid test coverage",
        ],
        outOfScope: [
          "wire changes",
          "resolver redesign",
          "real .ots parsing",
        ],
        acceptance: [
          "Path A validators perform real signature verification instead of hex-shape checks",
          "PMA, PMU, and PMX tests cover valid and invalid signatures",
          "resolver semantics remain unchanged apart from honest validation outcomes",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-schnorr-verification-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test packages/protocol-a/src/__tests__/protocol-a.test.ts",
          "bun run typecheck",
        ],
        stopIf: [...VERIFICATION_CREDIBILITY_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "path-c-schnorr-verification",
        title: "Path C real Schnorr verification",
        packetPath: ".private-docs/plans/path-c-schnorr-verification-packet.md",
        confidence: "very_high",
        focus:
          "Replace Path C event-signature shape checks with real verification while keeping Path C separate and advisory.",
        editTargets: [
          "packages/protocol-c/src/index.ts",
          "packages/protocol-c/src/__tests__/protocol-c.test.ts",
        ],
        inScope: [
          "STC event-signature verification",
          "STA event-signature verification",
          "deterministic valid and invalid test coverage",
        ],
        outOfScope: [
          "Path C resolver redesign",
          "Path A behavior changes beyond shared-helper reuse",
          "real .ots parsing",
        ],
        acceptance: [
          "Path C validators perform real event-signature verification",
          "STC and STA tests cover valid and invalid signatures",
          "Path C stays separate from Path A in logic and presentation",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-c-schnorr-verification-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
          "update .private-docs/plans/verification-credibility-loop.md",
        ],
        focusedVerification: [
          "bun test packages/protocol-c/src/__tests__/protocol-c.test.ts",
          "bun run typecheck",
        ],
        stopIf: [...VERIFICATION_CREDIBILITY_STOP_IF],
        gates: [...LIGHT_GATES],
      },
    ],
  };
}

export function getPathAConflictPlaybackAutonomousLoop(): AutonomousLoopPlan {
  return {
    id: "path-a-conflict-playback-loop",
    title: "Path A Conflict Playback Loop",
    lane: "path-a-conflict-playback",
    confidence: "very_high",
    mode: "executor_facing_implementation_loop",
    rationale:
      "These slices stay within one narrow Path A demoability lane: add root and child conflict fixtures, keep helper summaries honest for plural authority states, then lock demo and script parity without reopening protocol direction.",
    executorContract:
      "Execute the slices in order without interruption unless a hard stop triggers. After each slice, run the listed gates, update the packet and control docs honestly, then continue to the next queued slice.",
    currentPacketPath: ".private-docs/plans/path-a-conflict-fixtures-packet.md",
    loopDocPath: ".private-docs/plans/path-a-conflict-playback-loop.md",
    stopConditions: [...CONFLICT_PLAYBACK_STOP_IF],
    slices: [
      {
        id: "conflict-fixture-corpus",
        title: "Path A conflict fixture corpus",
        packetPath: ".private-docs/plans/path-a-conflict-fixtures-packet.md",
        confidence: "very_high",
        focus:
          "Add deterministic root and child conflict scenarios so multiple_roots and multiple_children are visible in the fixture corpus.",
        editTargets: [
          "packages/fixtures/src/index.ts",
          "packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
        ],
        inScope: [
          "deterministic root-conflict fixture",
          "deterministic child-conflict fixture",
          "fixture expected-state coverage",
        ],
        outOfScope: [
          "resolver redesign",
          "Path C changes",
          "real .ots parsing",
        ],
        acceptance: [
          "the fixture corpus includes at least one multiple_roots and one multiple_children scenario",
          "fixture tests stay deterministic with the new scenarios",
          "the new scenarios use the post-Schnorr real fixed-key corpus",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-conflict-fixtures-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test packages/fixtures/src/__tests__/path-a-fixtures.test.ts",
          "bun scripts/verify-scenario.ts",
        ],
        stopIf: [...CONFLICT_PLAYBACK_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "conflict-helper-guardrails",
        title: "Conflict helper guardrails",
        packetPath: ".private-docs/plans/path-a-conflict-helper-guard-packet.md",
        confidence: "very_high",
        focus:
          "Keep helper summaries explicit when root or child conflicts prevent choosing one active authority.",
        editTargets: [
          "apps/ots-helper/src/path-a-proof-bridge.ts",
          "apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts",
        ],
        inScope: [
          "helper summary behavior for root conflicts",
          "helper summary behavior for child conflicts",
          "bridge test coverage",
        ],
        outOfScope: [
          "new proof semantics",
          "protocol package changes",
          "Path C changes",
        ],
        acceptance: [
          "helper summaries do not imply confirmed authority coverage for multiple_roots or multiple_children",
          "bridge tests lock the no-single-authority posture for the new conflict scenarios",
          "existing execution-conflict helper behavior stays coherent",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-conflict-helper-guard-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test apps/ots-helper/src/__tests__/path-a-proof-bridge.test.ts",
          "bun scripts/verify-scenario.ts",
        ],
        stopIf: [...CONFLICT_PLAYBACK_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "conflict-demo-playback",
        title: "Conflict demo playback",
        packetPath: ".private-docs/plans/path-a-conflict-playback-packet.md",
        confidence: "very_high",
        focus:
          "Render root and child conflict scenarios coherently in the existing Path A workspace without overstating helper coverage.",
        editTargets: [
          "apps/demo-client/src/path-a-proof-view.ts",
          "apps/demo-client/src/App.tsx",
          "apps/demo-client/src/__tests__/path-a-proof-view.test.ts",
        ],
        inScope: [
          "Path A conflict playback copy and provenance",
          "root-conflict and child-conflict view-model behavior",
          "focused UI verification",
        ],
        outOfScope: [
          "new UI lanes",
          "Path C changes",
          "recovery bundle redesign",
        ],
        acceptance: [
          "root and child conflict scenarios render coherently in the Path A workspace",
          "helper cards do not imply authority coverage where one authority cannot be chosen",
          "view-model tests cover the new conflict scenarios",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-conflict-playback-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
        ],
        focusedVerification: [
          "bun test apps/demo-client/src/__tests__/path-a-proof-view.test.ts",
          "bun run build:demo",
          "manual browser smoke of the new Path A conflict scenarios",
        ],
        stopIf: [...CONFLICT_PLAYBACK_STOP_IF],
        gates: [...LIGHT_GATES],
      },
      {
        id: "conflict-script-parity",
        title: "Conflict script and doc parity",
        packetPath: ".private-docs/plans/path-a-conflict-script-parity-packet.md",
        confidence: "very_high",
        focus:
          "Keep scripts, helper output, fixtures, and docs aligned after the new conflict scenarios land.",
        editTargets: [
          "scripts/verify-scenario.ts",
          "handoff.md",
          ".private-docs/plans/build-plan.md",
        ],
        inScope: [
          "script output for root and child conflicts",
          "doc parity for the finished loop",
          "deterministic closeout behavior",
        ],
        outOfScope: [
          "broader protocol changes",
          "Path C changes",
          "new UI features",
        ],
        acceptance: [
          "verify-scenario output is deterministic for root and child conflict fixtures",
          "fixture, helper, demo, and docs describe the same conflict posture",
          "the loop can stop cleanly after parity is locked",
        ],
        docUpdates: [
          "close or update .private-docs/plans/path-a-conflict-script-parity-packet.md",
          "update handoff.md",
          "update .private-docs/plans/build-plan.md",
          "update .private-docs/plans/path-a-conflict-playback-loop.md",
        ],
        focusedVerification: [
          "bun scripts/verify-scenario.ts",
          "bun run typecheck",
        ],
        stopIf: [...CONFLICT_PLAYBACK_STOP_IF],
        gates: [...LIGHT_GATES],
      },
    ],
  };
}
