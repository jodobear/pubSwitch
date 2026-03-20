import {
  getDemoSecretKeyForPubkey,
  getPathAFixtureScenarios,
  getPathCFixtureScenarios,
  type PathAFixtureScenario,
  type PathCFixtureScenario,
} from "../../../packages/fixtures/src/index";
import { PMA_KIND, PMU_KIND, PMX_KIND, OTS_KIND } from "@tack/protocol-a";
import { STA_KIND, STC_KIND } from "@tack/protocol-c";
import { getSingleTagValue, type NostrEvent } from "@tack/protocol-shared";

export type DemoActor = {
  pubkey: string;
  secretKey: string;
  label: string;
};

export type PreparedAction = {
  id: string;
  title: string;
  detail: string;
  event: NostrEvent;
};

export type PathADemoPackage = {
  lane: "path-a";
  id: string;
  title: string;
  summary: string;
  scenario: PathAFixtureScenario;
  actors: DemoActor[];
  preparedActions: PreparedAction[];
  noteActors: DemoActor[];
  proofTargetIds: string[];
};

export type PathCDemoPackage = {
  lane: "path-c";
  id: string;
  title: string;
  summary: string;
  scenario: PathCFixtureScenario;
  actors: DemoActor[];
  preparedActions: PreparedAction[];
  noteActors: DemoActor[];
  proofTargetIds: string[];
};

export type LiveDemoPackage = PathADemoPackage | PathCDemoPackage;

export async function getLiveDemoPackages(): Promise<LiveDemoPackage[]> {
  const [pathAScenarios, pathCScenarios] = await Promise.all([
    getPathAFixtureScenarios(),
    getPathCFixtureScenarios(),
  ]);

  return [
    ...pathAScenarios.map((scenario) => buildPathAPackage(scenario)),
    ...pathCScenarios.map((scenario) => buildPathCPackage(scenario)),
  ];
}

export function sortEventsForDisplay(events: NostrEvent[]): NostrEvent[] {
  return [...events].sort((a, b) => b.created_at - a.created_at || (b.id ?? "").localeCompare(a.id ?? ""));
}

export function extractCalendarHints(proofEvent: NostrEvent): string[] {
  if (proofEvent.kind !== OTS_KIND || proofEvent.content.length === 0) {
    return [];
  }

  try {
    const binary = atob(proofEvent.content);
    const matches = binary.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
    return [...new Set(matches)];
  } catch {
    return [];
  }
}

function buildPathAPackage(scenario: PathAFixtureScenario): PathADemoPackage {
  const protocolActors = scenario.events
    .map((event) => buildActorLabelFromPathAEvent(event, scenario))
    .filter((actor): actor is DemoActor => actor !== undefined);
  const noteActors = uniqueActors([
    actorFromPubkey(scenario.oldPubkey, "Old key"),
    ...scenario.events
      .map((event) => buildActorLabelFromPathANotePerspective(event, scenario))
      .filter((actor): actor is DemoActor => actor !== undefined),
  ]);

  const preparedActions = [...scenario.events, ...scenario.otsProofs]
    .sort((a, b) => a.created_at - b.created_at || kindPriority(a.kind) - kindPriority(b.kind))
    .map((event) => ({
      id: event.id ?? `${event.kind}:${event.created_at}`,
      title: describePathAAction(event),
      detail: describePathAActionDetail(event),
      event,
    }));

  return {
    lane: "path-a",
    id: scenario.id,
    title: scenario.title,
    summary: scenario.summary,
    scenario,
    actors: uniqueActors(protocolActors),
    preparedActions,
    noteActors,
    proofTargetIds: scenario.events.map((event) => event.id!).filter(Boolean),
  };
}

function buildPathCPackage(scenario: PathCFixtureScenario): PathCDemoPackage {
  const actors = uniqueActors([
    actorFromPubkey(scenario.oldPubkey, "Old key"),
    actorFromPubkey(scenario.newPubkey, "New key"),
    ...scenario.attestations.map((event) => actorFromPubkey(event.pubkey, "Attestor")),
  ]);

  const preparedActions = [...scenario.claims, ...scenario.attestations]
    .sort((a, b) => a.created_at - b.created_at || kindPriority(a.kind) - kindPriority(b.kind))
    .map((event) => ({
      id: event.id ?? `${event.kind}:${event.created_at}`,
      title: describePathCAction(event, scenario),
      detail: describePathCActionDetail(event),
      event,
    }));

  return {
    lane: "path-c",
    id: scenario.id,
    title: scenario.title,
    summary: scenario.summary,
    scenario,
    actors,
    noteActors: actors,
    preparedActions,
    proofTargetIds: [],
  };
}

function buildActorLabelFromPathAEvent(
  event: NostrEvent,
  scenario: PathAFixtureScenario,
): DemoActor | undefined {
  if (event.kind === PMA_KIND) {
    return actorFromPubkey(event.pubkey, "Old key");
  }

  if (event.kind === PMU_KIND) {
    return actorFromPubkey(event.pubkey, "Migration key");
  }

  if (event.kind === PMX_KIND) {
    return actorFromPubkey(event.pubkey, "Migration key");
  }

  return actorFromPubkey(scenario.oldPubkey, "Old key");
}

function buildActorLabelFromPathANotePerspective(
  event: NostrEvent,
  scenario: PathAFixtureScenario,
): DemoActor | undefined {
  if (event.kind === PMX_KIND) {
    return actorFromPubkey(event.pubkey, "Migration key");
  }

  const migrationPubkey =
    getSingleTagValue(event, "u") ??
    getSingleTagValue(event, "m") ??
    getSingleTagValue(event, "n");

  return actorFromPubkey(migrationPubkey, migrationPubkey === scenario.oldPubkey ? "Old key" : "Successor candidate");
}

function actorFromPubkey(pubkey: string | undefined, defaultLabel: string): DemoActor | undefined {
  if (!pubkey) {
    return undefined;
  }

  const secretKey = getDemoSecretKeyForPubkey(pubkey);
  if (!secretKey) {
    return undefined;
  }

  return {
    pubkey,
    secretKey,
    label: defaultLabel,
  };
}

function uniqueActors(actors: Array<DemoActor | undefined>): DemoActor[] {
  const byPubkey = new Map<string, DemoActor>();

  for (const actor of actors) {
    if (!actor || byPubkey.has(actor.pubkey)) {
      continue;
    }

    byPubkey.set(actor.pubkey, actor);
  }

  return [...byPubkey.values()];
}

function describePathAAction(event: NostrEvent): string {
  switch (event.kind) {
    case PMA_KIND:
      return "Publish 1776 PMA";
    case PMU_KIND:
      return "Publish 1779 PMU";
    case PMX_KIND:
      return "Publish 1777 PMX";
    case OTS_KIND:
      return "Publish 1040 proof";
    default:
      return `Publish kind ${event.kind}`;
  }
}

function describePathAActionDetail(event: NostrEvent): string {
  if (event.kind === PMA_KIND) {
    return `Old key announces migration key ${shortHex(getSingleTagValue(event, "m"))}.`;
  }

  if (event.kind === PMU_KIND) {
    return `Authority update points to ${shortHex(getSingleTagValue(event, "u"))}.`;
  }

  if (event.kind === PMX_KIND) {
    return `Execution hands continuity to ${shortHex(event.pubkey)}.`;
  }

  return `OTS proof targets ${shortHex(getSingleTagValue(event, "e"))}.`;
}

function describePathCAction(event: NostrEvent, scenario: PathCFixtureScenario): string {
  if (event.kind === STC_KIND) {
    const role = getSingleTagValue(event, "r");
    return role === "new" ? "Publish 1778 STC as new key" : "Publish 1778 STC as old key";
  }

  const stance = getSingleTagValue(event, "s") ?? "uncertain";
  if (event.pubkey === scenario.oldPubkey || event.pubkey === scenario.newPubkey) {
    return `Publish 31778 STA (${stance}) as self-authored`;
  }

  return `Publish 31778 STA (${stance}) as third party`;
}

function describePathCActionDetail(event: NostrEvent): string {
  if (event.kind === STC_KIND) {
    return `Claim covers transition ${shortHex(getSingleTagValue(event, "o"))} -> ${shortHex(getSingleTagValue(event, "n"))}.`;
  }

  return `Attestation stance is ${getSingleTagValue(event, "s") ?? "uncertain"}.`;
}

function kindPriority(kind: number): number {
  if (kind === PMA_KIND || kind === STC_KIND) {
    return 0;
  }

  if (kind === OTS_KIND || kind === STA_KIND) {
    return 1;
  }

  if (kind === PMU_KIND) {
    return 2;
  }

  if (kind === PMX_KIND) {
    return 3;
  }

  return 10;
}

function shortHex(value: string | undefined): string {
  if (!value) {
    return "(none)";
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}
