import { describe, expect, test } from "bun:test";
import { getSingleTagValue, getTagValues, type NostrEvent } from "../nostr";

const exampleEvent: NostrEvent = {
  pubkey: "1111111111111111111111111111111111111111111111111111111111111111",
  created_at: 1,
  kind: 1779,
  tags: [
    ["o", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["e", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
    ["e", "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"],
    ["alt", "Prepared Migration Authority Update"],
    ["alt"],
  ],
  content: "",
};

describe("getTagValues", () => {
  test("returns every matching tag value in order", () => {
    expect(getTagValues(exampleEvent, "e")).toEqual([
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    ]);
  });

  test("normalizes missing values to empty strings", () => {
    expect(getTagValues(exampleEvent, "alt")).toEqual([
      "Prepared Migration Authority Update",
      "",
    ]);
  });
});

describe("getSingleTagValue", () => {
  test("returns the tag value only when exactly one tag exists", () => {
    expect(getSingleTagValue(exampleEvent, "o")).toBe(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  test("returns undefined when duplicates exist", () => {
    expect(getSingleTagValue(exampleEvent, "e")).toBeUndefined();
  });

  test("returns undefined when the tag is absent", () => {
    expect(getSingleTagValue(exampleEvent, "missing")).toBeUndefined();
  });
});
