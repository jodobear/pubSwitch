import type { PathAFixtureScenario, PathCFixtureScenario } from "./index";

export type DemoWalkthroughScenarioRef = {
  id: string;
  title: string;
  note: string;
  path: "path-a" | "path-c" | "recovery";
  proofBacking?: PathAFixtureScenario["proofBacking"];
};

export type DemoWalkthroughSection = {
  id: string;
  title: string;
  summary: string;
  items: DemoWalkthroughScenarioRef[];
};

export type DemoWalkthroughPlan = {
  pathAProofBackingCounts: Record<PathAFixtureScenario["proofBacking"], number>;
  sections: DemoWalkthroughSection[];
  caveats: string[];
};

export function buildDemoWalkthroughPlan(input: {
  pathAScenarios: PathAFixtureScenario[];
  pathCScenarios: PathCFixtureScenario[];
}): DemoWalkthroughPlan {
  const pathAById = new Map(input.pathAScenarios.map((scenario) => [scenario.id, scenario]));
  const pathCById = new Map(input.pathCScenarios.map((scenario) => [scenario.id, scenario]));

  const counts: DemoWalkthroughPlan["pathAProofBackingCounts"] = {
    real_helper_verified: 0,
    mixed_real_root: 0,
    fixture_placeholder: 0,
  };

  for (const scenario of input.pathAScenarios) {
    counts[scenario.proofBacking] += 1;
  }

  return {
    pathAProofBackingCounts: counts,
    sections: [
      {
        id: "path-a-real-basics",
        title: "Path A real-backed basics",
        summary: "Start with the fully real-backed PMA cases so the trust model is clear before the richer authority-chain scenarios.",
        items: [
          toPathAScenario(requirePathAScenario(pathAById, "pending-ots"), "Real pending proof bytes; pending OTS is not authority."),
          toPathAScenario(
            requirePathAScenario(pathAById, "real-confirmed-pma"),
            "Simplest fully real-backed confirmed PMA walkthrough.",
          ),
          toPathAScenario(
            requirePathAScenario(pathAById, "conflicting-roots"),
            "Two distinct real confirmed PMA roots share one earliest anchor height, so Path A stays plural.",
          ),
        ],
      },
      {
        id: "path-a-real-chain",
        title: "Path A real-backed chain cases",
        summary:
          "Then show the authority-chain and execution states that now use real helper-verifiable PMA and PMU proof pairs throughout the Path A lane.",
        items: [
          toPathAScenario(
            requirePathAScenario(pathAById, "confirmed-authority"),
            "Duplicate PMA and PMU collapse to one confirmed active authority.",
          ),
          toPathAScenario(
            requirePathAScenario(pathAById, "conflicting-children"),
            "Plural child conflict over one confirmed real-backed root.",
          ),
          toPathAScenario(
            requirePathAScenario(pathAById, "executed-happy-path"),
            "Confirmed active authority executes to one successor key.",
          ),
          toPathAScenario(
            requirePathAScenario(pathAById, "conflicting-executions"),
            "Two PMX successors remain after normalization, so execution stays unresolved.",
          ),
        ],
      },
      {
        id: "path-c-advisory",
        title: "Path C advisory lane",
        summary: "Show that Path C remains separate, local-policy advisory evidence and does not override Path A cryptographic state.",
        items: [
          toPathCScenario(
            requirePathCScenario(pathCById, "socially-supported"),
            "One followed third party supports the transition.",
          ),
          toPathCScenario(
            requirePathCScenario(pathCById, "socially-split"),
            "Followed attestors disagree after live-attestation supersession.",
          ),
          toPathCScenario(
            requirePathCScenario(pathCById, "self-asserted-noise"),
            "Self-authored STAs remain visible but do not count as independent support.",
          ),
        ],
      },
      {
        id: "recovery-demo",
        title: "Recovery flow",
        summary: "Finish with the encrypted bundle UX after a confirmed Path A scenario has established local control and authority state.",
        items: [
          {
            id: "recovery-from-confirmed-authority",
            title: "Recovery bundle from Confirmed Authority",
            note: "Use the Confirmed Authority scenario before export/import so the operator can explain the active PMU authority payload.",
            path: "recovery",
          },
        ],
      },
    ],
    caveats: [
      "Path A fixture resolution still uses local `x-verified-anchor-height` metadata because the pure resolver consumes browser-safe proof tags, while raw `.ots` parsing still lives in the helper layer.",
      "The browser demo shows a browser-safe real corpus snapshot; raw `.ots` verification still lives in the helper layer.",
      "Real `.ots` verification currently proves local parsing, digest binding, and Bitcoin-attestation presence or height, not independent block-header validation.",
    ],
  };
}

function requirePathAScenario(
  scenarios: Map<string, PathAFixtureScenario>,
  id: string,
): PathAFixtureScenario {
  const scenario = scenarios.get(id);
  if (!scenario) {
    throw new Error(`missing Path A walkthrough scenario ${id}`);
  }

  return scenario;
}

function requirePathCScenario(
  scenarios: Map<string, PathCFixtureScenario>,
  id: string,
): PathCFixtureScenario {
  const scenario = scenarios.get(id);
  if (!scenario) {
    throw new Error(`missing Path C walkthrough scenario ${id}`);
  }

  return scenario;
}

function toPathAScenario(
  scenario: PathAFixtureScenario,
  note: string,
): DemoWalkthroughScenarioRef {
  return {
    id: scenario.id,
    title: scenario.title,
    note,
    path: "path-a",
    proofBacking: scenario.proofBacking,
  };
}

function toPathCScenario(
  scenario: PathCFixtureScenario,
  note: string,
): DemoWalkthroughScenarioRef {
  return {
    id: scenario.id,
    title: scenario.title,
    note,
    path: "path-c",
  };
}
