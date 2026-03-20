import { buildPackageSubscriptionFilters, isEventRelevantToPackage, parseRelayUrls } from "../apps/demo-client/src/public-relay";
import type { LiveDemoPackage } from "../apps/demo-client/src/demo-packages";
import { resolvePreparedMigration } from "../packages/protocol-a/src/index";
import { resolveSocialTransition } from "../packages/protocol-c/src/index";
import type { NostrEvent } from "../packages/protocol-shared/src/index";

export const DEFAULT_RELAYS = parseRelayUrls(
  ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net"].join("\n"),
);

type RelayFrame =
  | ["EVENT", string, NostrEvent]
  | ["EOSE", string]
  | ["OK", string, boolean, string]
  | ["NOTICE", string];

export type RelayReceipt = {
  eventId: string;
  relayUrl: string;
  accepted: boolean;
  message: string;
  receivedAt: number;
};

export type RelayStatus = {
  url: string;
  state: "connecting" | "open" | "closed" | "error";
  detail?: string;
};

export type RelaySession = {
  package?: LiveDemoPackage;
  relays: string[];
  sockets: Map<string, WebSocket>;
  statuses: Map<string, RelayStatus>;
  receipts: RelayReceipt[];
  seenEventIds: Set<string>;
  observedEvents: NostrEvent[];
  close: () => void;
};

export async function openRelaySession(input: {
  relays?: string[];
  demoPackage?: LiveDemoPackage;
  since?: number;
  onEvent?: (event: NostrEvent, stateText?: string) => void | Promise<void>;
  onNotice?: (message: string, relayUrl: string) => void | Promise<void>;
  onReceipt?: (receipt: RelayReceipt) => void | Promise<void>;
}): Promise<RelaySession> {
  const relays = (input.relays && input.relays.length > 0 ? input.relays : DEFAULT_RELAYS).filter(Boolean);
  const sockets = new Map<string, WebSocket>();
  const statuses = new Map<string, RelayStatus>();
  const seenEventIds = new Set<string>();
  const observedEvents: NostrEvent[] = [];
  const receipts: RelayReceipt[] = [];

  await Promise.all(
    relays.map(
      (relayUrl) =>
        new Promise<void>((resolve) => {
          const socket = new WebSocket(relayUrl);
          sockets.set(relayUrl, socket);
          statuses.set(relayUrl, { url: relayUrl, state: "connecting" });

          const finish = () => resolve();

          socket.addEventListener("open", () => {
            statuses.set(relayUrl, { url: relayUrl, state: "open", detail: "subscribed" });

            if (input.demoPackage) {
              const subId = `tack-cli-${input.demoPackage.id}-${input.since ?? Math.floor(Date.now() / 1000)}`;
              socket.send(
                JSON.stringify([
                  "REQ",
                  subId,
                  ...buildPackageSubscriptionFilters(
                    input.demoPackage,
                    input.since ?? Math.floor(Date.now() / 1000),
                  ),
                ]),
              );
            }

            finish();
          });

          socket.addEventListener("message", async (message) => {
            const frame = parseRelayFrame(message.data);
            if (!frame) {
              return;
            }

            switch (frame[0]) {
              case "EVENT": {
                const event = frame[2];
                if (!event.id || seenEventIds.has(event.id)) {
                  return;
                }

                if (input.demoPackage && !isEventRelevantToPackage(event, input.demoPackage)) {
                  return;
                }

                seenEventIds.add(event.id);
                observedEvents.unshift(event);
                const stateText = input.demoPackage ? await summarizeObservedState(input.demoPackage, observedEvents) : undefined;
                await input.onEvent?.(event, stateText);
                return;
              }
              case "EOSE": {
                statuses.set(relayUrl, { url: relayUrl, state: "open", detail: "synced" });
                return;
              }
              case "OK": {
                const [, eventId, accepted, relayMessage] = frame;
                const receipt: RelayReceipt = {
                  eventId,
                  relayUrl,
                  accepted,
                  message: relayMessage,
                  receivedAt: Date.now(),
                };
                receipts.unshift(receipt);
                await input.onReceipt?.(receipt);
                return;
              }
              case "NOTICE": {
                const [, relayMessage] = frame;
                statuses.set(relayUrl, { url: relayUrl, state: "error", detail: relayMessage });
                await input.onNotice?.(relayMessage, relayUrl);
              }
            }
          });

          socket.addEventListener("error", () => {
            statuses.set(relayUrl, { url: relayUrl, state: "error", detail: "websocket error" });
            finish();
          });

          socket.addEventListener("close", () => {
            const existing = statuses.get(relayUrl);
            statuses.set(relayUrl, {
              url: relayUrl,
              state: existing?.state === "error" ? "error" : "closed",
              detail: existing?.detail ?? "closed",
            });
          });
        }),
    ),
  );

  return {
    package: input.demoPackage,
    relays,
    sockets,
    statuses,
    receipts,
    seenEventIds,
    observedEvents,
    close() {
      for (const socket of sockets.values()) {
        socket.close();
      }
      sockets.clear();
    },
  };
}

export async function publishEvent(session: RelaySession, event: NostrEvent, settleMs = 1200): Promise<RelayReceipt[]> {
  for (const socket of session.sockets.values()) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(["EVENT", event]));
    }
  }

  await Bun.sleep(settleMs);
  return session.receipts.filter((receipt) => receipt.eventId === event.id);
}

export function formatReceiptSummary(receipts: RelayReceipt[]): string {
  if (receipts.length === 0) {
    return "no receipts yet";
  }

  return receipts
    .map((receipt) => {
      const summary = receipt.accepted
        ? "accepted"
        : `${receipt.message}`.toLowerCase().includes("duplicate")
          ? "duplicate"
          : "rejected";
      return `${receipt.relayUrl}=${summary}`;
    })
    .join(" | ");
}

export async function summarizeObservedState(
  demoPackage: LiveDemoPackage,
  observedEvents: NostrEvent[],
): Promise<string> {
  if (demoPackage.lane === "path-a") {
    const pathAProtocolEvents = observedEvents.filter((event) => [1776, 1779, 1777].includes(event.kind));
    const pathAProofEvents = observedEvents.filter((event) => event.kind === 1040);
    const state = resolvePreparedMigration({
      oldPubkey: demoPackage.scenario.oldPubkey,
      events: pathAProtocolEvents,
      otsProofs: pathAProofEvents,
    });
    return state.state;
  }

  const claims = observedEvents.filter((event) => event.kind === 1778);
  const attestations = observedEvents.filter((event) => event.kind === 31778);
  const state = await resolveSocialTransition({
    viewerFollowSet: new Set(demoPackage.scenario.viewerFollowPubkeys),
    oldPubkey: demoPackage.scenario.oldPubkey,
    newPubkey: demoPackage.scenario.newPubkey,
    claims,
    attestations,
  });
  return state.state;
}

function parseRelayFrame(value: string | ArrayBuffer | Blob): RelayFrame | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as RelayFrame) : undefined;
  } catch {
    return undefined;
  }
}

