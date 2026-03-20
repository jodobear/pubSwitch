import { describe, expect, test } from "bun:test";
import { describeAudienceDecision, getPathCAudienceExperience } from "../path-c-audience-demo";

describe("path c audience demo", () => {
  test("builds a 21-person room with 12 follow-backs", async () => {
    const experience = await getPathCAudienceExperience("socially-supported");

    expect(experience.members).toHaveLength(21);
    expect(experience.members.filter((member) => member.followedBack)).toHaveLength(12);
    expect(experience.members.filter((member) => member.viewerFollows)).toHaveLength(5);
  });

  test("ends in socially supported when followed mutuals support", async () => {
    const experience = await getPathCAudienceExperience("socially-supported");
    const finalStep = experience.steps.at(-1);

    expect(finalStep?.state.state).toBe("socially_supported");
    expect(finalStep?.recommendedAction).toBe("accept");
    expect(finalStep?.visibleAttestations).toHaveLength(4);
  });

  test("ends in socially split when a followed mutual opposes", async () => {
    const experience = await getPathCAudienceExperience("socially-split");
    const finalStep = experience.steps.at(-1);

    expect(finalStep?.state.state).toBe("socially_split");
    expect(finalStep?.recommendedAction).toBe("ignore");
    expect(finalStep?.visibleAttestations).toHaveLength(5);
  });

  test("keeps self-authored noise in claimed state", async () => {
    const experience = await getPathCAudienceExperience("self-asserted-noise");
    const finalStep = experience.steps.at(-1);

    expect(finalStep?.state.state).toBe("claimed");
    expect(finalStep?.visibleAttestations).toHaveLength(2);
  });

  test("describes local actions without claiming they are protocol truth", async () => {
    const experience = await getPathCAudienceExperience("socially-split");
    const finalStep = experience.steps.at(-1)!;

    expect(describeAudienceDecision({ decision: undefined, step: finalStep }).title).toContain("No local action");
    expect(describeAudienceDecision({ decision: "accept", step: finalStep }).tone).toBe("warn");
    expect(describeAudienceDecision({ decision: "reject", step: finalStep }).tone).toBe("error");
    expect(describeAudienceDecision({ decision: "ignore", step: finalStep }).tone).toBe("neutral");
  });
});
