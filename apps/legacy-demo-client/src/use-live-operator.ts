import { useEffect, useMemo, useRef, useState } from "react";
import {
  RECOVERY_BUNDLE_DEFAULT_ITERATIONS,
  buildRecoveryBundlePayloadFromPathAScenario,
  encryptRecoveryBundle,
  serializeRecoveryBundleEnvelope,
} from "./recovery-bundle";
import { extractCalendarHints, getLiveDemoPackages, sortEventsForDisplay, type LiveDemoPackage } from "./demo-packages";
import {
  buildPackageSubscriptionFilters,
  isEventRelevantToPackage,
  parseRelayUrls,
  sortObservedEvents,
  type PublishReceipt,
  type RelayConnectionStatus,
} from "./public-relay";
import { resolvePreparedMigration } from "@tack/protocol-a";
import { resolveSocialTransition } from "@tack/protocol-c";
import { signNostrEventWithSecretKey, type NostrEvent } from "@tack/protocol-shared";
import { inspectOtsProofEvent } from "../../ots-helper/src/inspect";

const DEFAULT_RELAYS = parseRelayUrls(
  [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net",
    "wss://relay.nostr.band",
    "wss://nostr.wine",
  ].join("\n"),
);
const NOTE_KIND = 1;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; packages: LiveDemoPackage[]; selectedId: string };

type RelayFrame =
  | ["EVENT", string, NostrEvent]
  | ["EOSE", string]
  | ["OK", string, boolean, string]
  | ["NOTICE", string];

export type DemoMode = "live" | "rehearsal";

export function useLiveOperator() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [demoMode, setDemoMode] = useState<DemoMode>("rehearsal");
  const [isConnected, setIsConnected] = useState(false);
  const [sessionSince, setSessionSince] = useState(() => Math.floor(Date.now() / 1000));
  const [connectionMap, setConnectionMap] = useState<Record<string, RelayConnectionStatus>>({});
  const [observedEvents, setObservedEvents] = useState<NostrEvent[]>([]);
  const [publishReceipts, setPublishReceipts] = useState<PublishReceipt[]>([]);
  const [publishCursor, setPublishCursor] = useState(0);
  const [noteDraft, setNoteDraft] = useState("gm from tack");
  const [selectedNoteActorPubkey, setSelectedNoteActorPubkey] = useState("");
  const [operatorMessage, setOperatorMessage] = useState("");
  const [bundlePassphrase, setBundlePassphrase] = useState("");
  const [bundleEnvelopeText, setBundleEnvelopeText] = useState("");
  const [bundleMessage, setBundleMessage] = useState("");
  const socketsRef = useRef<Map<string, WebSocket>>(new Map());
  const relayUrls = DEFAULT_RELAYS;

  useEffect(() => {
    let cancelled = false;

    getLiveDemoPackages()
      .then((packages) => {
        if (cancelled) {
          return;
        }

        setState({
          status: "ready",
          packages,
          selectedId: packages.find((entry) => entry.id === "pending-ots")?.id ?? packages[0]?.id ?? "",
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentPackage =
    state.status === "ready"
      ? state.packages.find((entry) => entry.id === state.selectedId) ?? state.packages[0]
      : undefined;

  const selectedNoteActor =
    currentPackage?.noteActors.find((actor) => actor.pubkey === selectedNoteActorPubkey) ??
    currentPackage?.noteActors[0];

  const relevantObservedEvents = useMemo(
    () =>
      currentPackage
        ? sortObservedEvents(observedEvents.filter((event) => isEventRelevantToPackage(event, currentPackage)))
        : [],
    [observedEvents, currentPackage],
  );

  const noteEvents = relevantObservedEvents.filter((event) => event.kind === NOTE_KIND);
  const pathAProtocolEvents = relevantObservedEvents.filter((event) => [1776, 1779, 1777].includes(event.kind));
  const pathAProofEvents = relevantObservedEvents.filter((event) => event.kind === 1040);
  const pathCClaims = relevantObservedEvents.filter((event) => event.kind === 1778);
  const pathCAttestations = relevantObservedEvents.filter((event) => event.kind === 31778);

  const pathAState =
    currentPackage?.lane === "path-a"
      ? resolvePreparedMigration({
          oldPubkey: currentPackage.scenario.oldPubkey,
          events: pathAProtocolEvents,
          otsProofs: pathAProofEvents,
        })
      : undefined;

  const [pathCStateText, setPathCStateText] = useState("none");

  useEffect(() => {
    if (!currentPackage || currentPackage.lane !== "path-c") {
      setPathCStateText("none");
      return;
    }

    let cancelled = false;
    resolveSocialTransition({
      viewerFollowSet: new Set(currentPackage.scenario.viewerFollowPubkeys),
      oldPubkey: currentPackage.scenario.oldPubkey,
      newPubkey: currentPackage.scenario.newPubkey,
      claims: pathCClaims,
      attestations: pathCAttestations,
    }).then((value) => {
      if (!cancelled) {
        setPathCStateText(value.state);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentPackage, pathCClaims, pathCAttestations]);

  useEffect(() => {
    if (!currentPackage) {
      return;
    }

    setSelectedNoteActorPubkey(currentPackage.noteActors[0]?.pubkey ?? "");
    setPublishCursor(0);
    setObservedEvents([]);
    setPublishReceipts([]);
    setBundleEnvelopeText("");
    setBundleMessage("");
    setBundlePassphrase("");
    setSessionSince(Math.floor(Date.now() / 1000));
  }, [currentPackage?.id]);

  useEffect(() => {
    for (const socket of socketsRef.current.values()) {
      socket.close();
    }
    socketsRef.current.clear();

    if (!isConnected || !currentPackage || relayUrls.length === 0) {
      return;
    }

    setConnectionMap(Object.fromEntries(relayUrls.map((url) => [url, { url, state: "connecting" as const }])));

    relayUrls.forEach((url, index) => {
      const socket = new WebSocket(url);
      socketsRef.current.set(url, socket);

      socket.onopen = () => {
        setConnectionMap((current) => ({
          ...current,
          [url]: { url, state: "open", detail: "subscribed" },
        }));

        const subId = `tack-${currentPackage.id}-${sessionSince}-${index}`;
        socket.send(JSON.stringify(["REQ", subId, ...buildPackageSubscriptionFilters(currentPackage, sessionSince)]));
      };

      socket.onmessage = (message) => {
        let frame: RelayFrame | undefined;

        try {
          frame = JSON.parse(String(message.data));
        } catch {
          return;
        }

        if (!Array.isArray(frame)) {
          return;
        }

        switch (frame[0]) {
          case "EVENT": {
            const event = frame[2];
            if (!event?.id || !isEventRelevantToPackage(event, currentPackage)) {
              return;
            }

            setObservedEvents((current) => {
              if (current.some((entry) => entry.id === event.id)) {
                return current;
              }

              return sortEventsForDisplay([event, ...current]);
            });
            return;
          }
          case "EOSE": {
            setConnectionMap((current) => ({
              ...current,
              [url]: { url, state: "open", detail: "synced" },
            }));
            return;
          }
          case "OK": {
            const [, eventId, accepted, relayMessage] = frame;
            setPublishReceipts((current) => [
              {
                eventId,
                relayUrl: url,
                accepted,
                message: relayMessage,
                receivedAt: Date.now(),
              },
              ...current,
            ]);
            return;
          }
          case "NOTICE": {
            const [, relayMessage] = frame;
            setConnectionMap((current) => ({
              ...current,
              [url]: { url, state: current[url]?.state === "open" ? "open" : "error", detail: relayMessage },
            }));
          }
        }
      };

      socket.onerror = () => {
        setConnectionMap((current) => ({
          ...current,
          [url]: { url, state: "error", detail: "websocket error" },
        }));
      };

      socket.onclose = () => {
        setConnectionMap((current) => ({
          ...current,
          [url]: { url, state: "closed", detail: current[url]?.detail ?? "closed" },
        }));
      };
    });

    return () => {
      for (const socket of socketsRef.current.values()) {
        socket.close();
      }
      socketsRef.current.clear();
    };
  }, [currentPackage, isConnected, relayUrls, sessionSince]);

  const proofCalendarHints = pathAProofEvents.flatMap((event) => extractCalendarHints(event));
  const proofInspections = pathAProofEvents.map((event) => inspectOtsProofEvent(event));
  const pendingProofCount = proofInspections.filter((entry) => entry.ok && entry.status === "pending").length;
  const confirmedProofCount = proofInspections.filter((entry) => entry.ok && entry.status === "bitcoin_confirmed").length;
  const openRelayCount = relayUrls.filter((url) => connectionMap[url]?.state === "open").length;

  const proofStatusLabel =
    currentPackage?.lane === "path-a"
      ? confirmedProofCount > 0
        ? `${confirmedProofCount} confirmed`
        : pendingProofCount > 0
          ? `${pendingProofCount} pending`
          : pathAProofEvents.length > 0
            ? `${pathAProofEvents.length} observed`
            : "none"
      : `${pathCAttestations.length} attestations`;

  const nextPreparedAction = currentPackage?.preparedActions[publishCursor];

  function receiptsForEvent(eventId: string) {
    return publishReceipts.filter((entry) => entry.eventId === eventId);
  }

  function injectLocalEvent(event: NostrEvent) {
    setObservedEvents((current) => {
      if (current.some((existing) => existing.id === event.id)) {
        return current;
      }
      return [...current, event];
    });
  }

  async function publishEvent(event: NostrEvent) {
    if (demoMode === "rehearsal") {
      injectLocalEvent(event);
      return;
    }

    const sent = [...socketsRef.current.values()].filter((socket) => socket.readyState === WebSocket.OPEN);
    if (sent.length === 0) {
      throw new Error("No open relay connections. Connect first.");
    }

    for (const socket of sent) {
      socket.send(JSON.stringify(["EVENT", event]));
    }
  }

  async function publishPreparedEvent(event: NostrEvent) {
    await publishEvent(event);
    const suffix = demoMode === "rehearsal" ? "(rehearsal)" : `to ${socketsRef.current.size} connected relays`;
    setOperatorMessage(`Published ${event.id ? `${event.id.slice(0, 10)}...${event.id.slice(-8)}` : "event"} ${suffix}.`);
  }

  async function publishNextPreparedAction() {
    if (!nextPreparedAction) {
      return;
    }

    await publishPreparedEvent(nextPreparedAction.event);
    setPublishCursor((current) => Math.min(currentPackage?.preparedActions.length ?? current, current + 1));
  }

  async function publishAllRemainingActions() {
    const remaining = currentPackage?.preparedActions.slice(publishCursor) ?? [];
    for (const action of remaining) {
      await publishEvent(action.event);
    }
    if (currentPackage) {
      setPublishCursor(currentPackage.preparedActions.length);
    }
    const suffix = demoMode === "rehearsal" ? "(rehearsal)" : "";
    setOperatorMessage(`Published ${remaining.length} prepared event${remaining.length === 1 ? "" : "s"} ${suffix}.`);
  }

  async function publishLiveNote() {
    if (!selectedNoteActor) {
      throw new Error("Choose a note actor first");
    }

    const event = signNostrEventWithSecretKey(
      {
        pubkey: selectedNoteActor.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: NOTE_KIND,
        tags: [],
        content: noteDraft,
      },
      selectedNoteActor.secretKey,
    );

    await publishEvent(event);
    const suffix = demoMode === "rehearsal" ? "(rehearsal)" : `as ${selectedNoteActor.label}`;
    setOperatorMessage(`Published note ${event.id ? `${event.id.slice(0, 10)}...${event.id.slice(-8)}` : ""} ${suffix}.`);
  }

  async function createBundle() {
    if (!currentPackage || currentPackage.lane !== "path-a") {
      setBundleMessage("Recovery bundle export is only defined for Path A demo sets.");
      return;
    }

    const bundle = buildRecoveryBundlePayloadFromPathAScenario({
      scenario: currentPackage.scenario,
    });
    const envelope = await encryptRecoveryBundle({
      bundle,
      passphrase: bundlePassphrase,
      iterations: RECOVERY_BUNDLE_DEFAULT_ITERATIONS,
    });

    setBundleEnvelopeText(serializeRecoveryBundleEnvelope(envelope));
    setBundleMessage(`Encrypted backup prepared from ${currentPackage.title}.`);
  }

  function selectPackage(selectedId: string) {
    setState((current) => (current.status === "ready" ? { ...current, selectedId } : current));
  }

  function resetSession() {
    setObservedEvents([]);
    setPublishReceipts([]);
    setPublishCursor(0);
    setSessionSince(Math.floor(Date.now() / 1000));
    setOperatorMessage("Session reset. All events cleared — ready to publish again.");
  }

  return {
    state,
    currentPackage,
    demoMode,
    setDemoMode,
    relayUrls,
    connectionMap,
    isConnected,
    setIsConnected,
    selectPackage,
    resetSession,
    observedEvents,
    relevantObservedEvents,
    noteEvents,
    pathAProtocolEvents,
    pathAProofEvents,
    pathCClaims,
    pathCAttestations,
    pathAState,
    pathCStateText,
    proofCalendarHints,
    pendingProofCount,
    confirmedProofCount,
    openRelayCount,
    proofStatusLabel,
    nextPreparedAction,
    publishCursor,
    noteDraft,
    setNoteDraft,
    selectedNoteActor,
    selectedNoteActorPubkey,
    setSelectedNoteActorPubkey,
    operatorMessage,
    setOperatorMessage,
    bundleMessage,
    bundlePassphrase,
    setBundlePassphrase,
    bundleEnvelopeText,
    receiptsForEvent,
    publishPreparedEvent,
    publishNextPreparedAction,
    publishAllRemainingActions,
    publishLiveNote,
    createBundle,
  };
}
