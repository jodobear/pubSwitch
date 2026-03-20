import { describe, expect, test } from "bun:test";
import { computeTransitionId } from "../transition";

describe("computeTransitionId", () => {
  test("is deterministic for the same pair", async () => {
    const oldPubkey = "1111111111111111111111111111111111111111111111111111111111111111";
    const newPubkey = "2222222222222222222222222222222222222222222222222222222222222222";

    const first = await computeTransitionId(oldPubkey, newPubkey);
    const second = await computeTransitionId(oldPubkey, newPubkey);

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });

  test("matches the frozen transition-id fixture vector", async () => {
    const oldPubkey = "0000000000000000000000000000000000000000000000000000000000000001";
    const newPubkey = "fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe";

    await expect(computeTransitionId(oldPubkey, newPubkey)).resolves.toBe(
      "85c96d5c893213af821791e2e96833af2264d22947370fa8c71769271c23709e",
    );
  });

  test("rejects non-lowercase inputs", async () => {
    await expect(
      computeTransitionId(
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "2222222222222222222222222222222222222222222222222222222222222222",
      ),
    ).rejects.toThrow("oldPubkey must be lowercase hex");
  });
});
