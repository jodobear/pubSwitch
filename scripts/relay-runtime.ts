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

export type NostrRelayFilter = {
  authors?: string[];
  ids?: string[];
  kinds?: number[];
  since?: number;
  limit?: number;
  [key: `#${string}`]: string[] | number | string[] | undefined;
};

export type RelaySession = {
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
  filters?: NostrRelayFilter[];
  onEvent?: (event: NostrEvent) => void | Promise<void>;
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
            statuses.set(relayUrl, { url: relayUrl, state: "open", detail: input.filters ? "subscribed" : "connected" });
            if (input.filters && input.filters.length > 0) {
              socket.send(JSON.stringify(["REQ", `pubswitch-cli-${Date.now()}`, ...input.filters]));
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

                seenEventIds.add(event.id);
                observedEvents.unshift(event);
                await input.onEvent?.(event);
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
                return;
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

export function parseRelayUrls(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter((value) => value.startsWith("wss://")),
    ),
  ];
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
