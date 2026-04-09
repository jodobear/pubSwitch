import { describe, expect, test } from "bun:test";
import {
  buildOnstageEventRows,
  describeFollowerStage,
  describePreparedMigrationStage,
  describeSocialStage,
  getPreparedMigrationStateSteps,
  getSocialStateSteps,
  kindLabel,
} from "../onstage-view";

describe("onstage view helpers", () => {
  test("describes confirmed prepared migration cleanly", () => {
    const result = describePreparedMigrationStage({
      state: "bitcoin_confirmed",
      authorityId: "a".repeat(64),
      authorityPubkey: "b".repeat(64),
      anchorHeight: 123,
      otsEventIds: ["c".repeat(64)],
    });
    expect(result).toMatchObject({
      tone: "ok",
      label: "Prepared",
    });
    expect(result.clientAction).toBeDefined();
  });

  test("keeps follower conflict as a stop state", () => {
    expect(
      describeFollowerStage({
        tone: "error",
        title: "This rotation is unresolved",
        detail: "Followers should see a stop-state warning.",
        showAttestAction: false,
        recommendedAction: "reject",
      }),
    ).toMatchObject({
      tone: "error",
      label: "Stop state",
    });
  });

  test("describes social split as advisory disagreement", () => {
    expect(describeSocialStage("socially_split")).toMatchObject({
      tone: "warn",
      label: "Split",
    });
  });

  test("marks prepared events as queued, sent, then observed", () => {
    const actions = [
      {
        id: "pma",
        title: "Publish 1776 PMA",
        detail: "",
        event: { id: "a".repeat(64), kind: 1776, tags: [], content: "", created_at: 1, pubkey: "b".repeat(64), sig: "c".repeat(128) },
      },
      {
        id: "ots",
        title: "Publish 1040 proof",
        detail: "",
        event: { id: "d".repeat(64), kind: 1040, tags: [], content: "", created_at: 2, pubkey: "e".repeat(64), sig: "f".repeat(128) },
      },
    ];

    expect(buildOnstageEventRows({ actions, observedEvents: [], publishCursor: 0, kinds: [1776, 1040] })).toEqual([
      { id: "pma", kind: 1776, label: "1776 PMA", status: "queued" },
      { id: "ots", kind: 1040, label: "1040 proof", status: "queued" },
    ]);

    expect(buildOnstageEventRows({ actions, observedEvents: [], publishCursor: 2, kinds: [1776, 1040] })).toEqual([
      { id: "pma", kind: 1776, label: "1776 PMA", status: "sent" },
      { id: "ots", kind: 1040, label: "1040 proof", status: "sent" },
    ]);

    expect(
      buildOnstageEventRows({
        actions,
        observedEvents: [actions[0]!.event],
        publishCursor: 2,
        kinds: [1776, 1040],
      }),
    ).toEqual([
      { id: "pma", kind: 1776, label: "1776 PMA", status: "observed" },
      { id: "ots", kind: 1040, label: "1040 proof", status: "sent" },
    ]);
  });

  test("kindLabel maps protocol kinds to human labels", () => {
    expect(kindLabel(1776)).toBe("Migration authority");
    expect(kindLabel(1040)).toBe("Timestamp proof");
    expect(kindLabel(1777)).toBe("Execution");
    expect(kindLabel(1779)).toBe("Authority update");
    expect(kindLabel(1778)).toBe("Transition claim");
    expect(kindLabel(31778)).toBe("Attestation");
    expect(kindLabel(1)).toBe("Note");
    expect(kindLabel(9999)).toBe("kind 9999");
  });

  test("getPreparedMigrationStateSteps highlights current state", () => {
    const steps = getPreparedMigrationStateSteps({
      state: "bitcoin_confirmed",
      authorityId: "a".repeat(64),
      authorityPubkey: "b".repeat(64),
      anchorHeight: 123,
      otsEventIds: ["c".repeat(64)],
    });
    const active = steps.filter((s) => s.active);
    expect(active).toHaveLength(1);
    expect(active[0]!.key).toBe("confirmed");
    expect(active[0]!.tone).toBe("ok");
  });

  test("getPreparedMigrationStateSteps adds conflict step for conflict state", () => {
    const steps = getPreparedMigrationStateSteps({
      state: "conflict",
      conflictKind: "multiple_executions",
      activeAuthorityId: "a".repeat(64),
      authorities: [],
    } as any);
    const active = steps.filter((s) => s.active);
    expect(active).toHaveLength(1);
    expect(active[0]!.key).toBe("conflict");
    expect(active[0]!.tone).toBe("error");
  });

  test("getSocialStateSteps highlights current social state", () => {
    const steps = getSocialStateSteps("socially_supported");
    const active = steps.filter((s) => s.active);
    expect(active).toHaveLength(1);
    expect(active[0]!.key).toBe("supported");
    expect(active[0]!.tone).toBe("ok");
  });
});
