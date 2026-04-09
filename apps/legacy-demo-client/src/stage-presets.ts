export type StageScenarioPreset = {
  id: "happy" | "contested";
  label: string;
  packageId: string;
  detail: string;
};

export const STAGE_SCENARIO_PRESETS: StageScenarioPreset[] = [
  {
    id: "happy",
    label: "Happy",
    packageId: "executed-happy-path",
    detail: "Clean confirmed chain to one successor.",
  },
  {
    id: "contested",
    label: "Contested",
    packageId: "conflicting-executions",
    detail: "Valid chain, contested successor outcome.",
  },
];

export function resolveStageScenarioId(input: string): string {
  const normalized = input.trim().toLowerCase();
  return STAGE_SCENARIO_PRESETS.find((entry) => entry.id === normalized)?.packageId ?? input;
}
