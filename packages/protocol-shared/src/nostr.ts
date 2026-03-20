export type Hex32 = string;
export type EventId = string;
export type NostrTag = string[];

export type NostrEvent = {
  id?: EventId;
  pubkey: Hex32;
  created_at: number;
  kind: number;
  tags: NostrTag[];
  content: string;
  sig?: string;
};

export function getTagValues(
  event: Pick<NostrEvent, "tags">,
  tagName: string,
): string[] {
  return event.tags.filter((tag) => tag[0] === tagName).map((tag) => tag[1] ?? "");
}

export function getSingleTagValue(
  event: Pick<NostrEvent, "tags">,
  tagName: string,
): string | undefined {
  const matches = getTagValues(event, tagName);

  if (matches.length !== 1) {
    return undefined;
  }

  return matches[0];
}
