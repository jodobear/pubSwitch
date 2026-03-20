import {
  buildDemoWalkthroughPlan,
  getPathAFixtureScenarios,
  getPathCFixtureScenarios,
  type PathAFixtureScenario,
} from "../packages/fixtures/src/index";

const plan = buildDemoWalkthroughPlan({
  pathAScenarios: await getPathAFixtureScenarios(),
  pathCScenarios: await getPathCFixtureScenarios(),
});

console.log("# Demo Walkthrough");
console.log("");
console.log("Path A proof-backing coverage:");
console.log(`- fully real-backed: ${plan.pathAProofBackingCounts.real_helper_verified}`);
console.log(`- mixed real root: ${plan.pathAProofBackingCounts.mixed_real_root}`);
console.log(`- placeholder only: ${plan.pathAProofBackingCounts.fixture_placeholder}`);
console.log("");

for (const [index, section] of plan.sections.entries()) {
  console.log(`${index + 1}. ${section.title}`);
  console.log(`   ${section.summary}`);

  for (const item of section.items) {
    const proofBacking =
      item.path === "path-a" && item.proofBacking
        ? ` [${describeProofBacking(item.proofBacking)}]`
        : "";
    const verifyCommand =
      item.path === "path-a" || item.path === "path-c"
        ? ` | verify: bun scripts/verify-scenario.ts ${item.id}`
        : "";
    console.log(`   - ${item.title}${proofBacking}`);
    console.log(`     note: ${item.note}${verifyCommand}`);
  }

  console.log("");
}

console.log("Caveats:");
for (const caveat of plan.caveats) {
  console.log(`- ${caveat}`);
}

function describeProofBacking(value: PathAFixtureScenario["proofBacking"]): string {
  if (value === "real_helper_verified") {
    return "fully real-backed";
  }

  if (value === "mixed_real_root") {
    return "mixed real root";
  }

  return "placeholder-only";
}
