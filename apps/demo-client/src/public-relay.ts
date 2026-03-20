import type { NostrEvent } from "@tack/protocol-shared";
import type { LiveDemoPackage } from "./demo-packages";

export type NostrRelayFilter = {
  authors?: string[];
  ids?: string[];
  kinds?: number[];
  since?: number;
  limit?: number;
  [key: `#${string}`]: string[] | number | string[] | undefined;
};

export type RelayConnectionStatus = {
  url: string;
  state: "idle" | "connecting" | "open" | "closed" | "error";
  detail?: string;
};

export type RelayNotice = {
  relayUrl: string;
  message: string;
  receivedAt: number;
};

export type PublishReceipt = {
  eventId: string;
  relayUrl: string;
  accepted: boolean;
  message: string;
  receivedAt: number;
};

export function parseRelayUrls(text: string): string[] {
  return [...new Set(text
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter((value) => value.startsWith("wss://")))];
}

export function buildPackageSubscriptionFilters(
  demoPackage: LiveDemoPackage,
  sessionSince: number,
): NostrRelayFilter[] {
  const noteAuthors = demoPackage.noteActors.map((actor) => actor.pubkey);

  if (demoPackage.lane === "path-a") {
    return [
      {
        authors: noteAuthors,
        kinds: [1],
        since: sessionSince,
      },
      {
        ids: demoPackage.scenario.events.map((event) => event.id!).filter(Boolean),
      },
      {
        ids: demoPackage.scenario.otsProofs.map((event) => event.id!).filter(Boolean),
      },
    ];
  }

  return [
    {
      authors: noteAuthors,
      kinds: [1],
      since: sessionSince,
    },
    {
      ids: demoPackage.scenario.claims.map((event) => event.id!).filter(Boolean),
    },
    {
      ids: demoPackage.scenario.attestations.map((event) => event.id!).filter(Boolean),
    },
  ];
}

export function isEventRelevantToPackage(event: NostrEvent, demoPackage: LiveDemoPackage): boolean {
  const actorPubkeys = new Set(demoPackage.actors.map((actor) => actor.pubkey));
  if (actorPubkeys.has(event.pubkey)) {
    return true;
  }

  if (event.kind === 1040) {
    const targetId = event.tags.find((tag) => tag[0] === "e")?.[1];
    return typeof targetId === "string" && demoPackage.proofTargetIds.includes(targetId);
  }

  return false;
}

export function sortObservedEvents(events: NostrEvent[]): NostrEvent[] {
  return [...events].sort((a, b) => b.created_at - a.created_at || (b.id ?? "").localeCompare(a.id ?? ""));
}
