import type { PathALivePlayback, PathCLivePlayback } from "../apps/demo-client/src/live-demo";
import { bech32 } from "@scure/base";
import qrcode from "qrcode-terminal";
import { hexToBytes } from "../packages/protocol-shared/src/index";

export type DemoCliPlayback = PathALivePlayback | PathCLivePlayback;

export function formatDemoCliPlayback(playback: DemoCliPlayback): string {
  const lines: string[] = [];
  lines.push(`# tack CLI demo: ${playback.scenarioId}`);
  lines.push("");
  lines.push("Actions:");

  playback.actions.forEach((action, index) => {
    lines.push(`${index + 1}. ${action.title}`);
    lines.push(`   ${action.subtitle}`);
  });

  lines.push("");
  lines.push("State progression:");

  playback.steps.forEach((step) => {
    lines.push(`${step.index}. ${step.title}`);
    lines.push(`   ${step.detail}`);
    if (step.currentAction) {
      lines.push(`   action: ${step.currentAction.title}`);
    } else {
      lines.push("   action: start");
    }

    step.clientFacts.forEach((fact) => {
      lines.push(`   - ${fact}`);
    });
  });

  return lines.join("\n");
}

export function formatDemoCliRunPlan(input: {
  scenarioId: string;
  title: string;
  lane: "path-a" | "path-c";
  actorLabel: string;
  relayCount: number;
  liveNote: boolean;
  watchSeconds: number;
  actions: Array<{ title: string; subtitle: string }>;
}): string {
  const lines: string[] = [];
  lines.push(`# tack live run: ${input.scenarioId}`);
  lines.push(`${input.title} · ${input.lane.toUpperCase()} · actor ${input.actorLabel}`);
  lines.push("");
  lines.push(`relays: ${input.relayCount}`);
  lines.push(`live note: ${input.liveNote ? "yes" : "no"}`);
  lines.push(`watch window: ${input.watchSeconds}s`);
  lines.push("");
  lines.push("sequence:");
  lines.push(`1. share actor QR / npub`);
  if (input.liveNote) {
    lines.push(`2. publish live kind 1 note`);
    lines.push(`3. publish prepared scenario events`);
    lines.push(`4. watch relay activity and resolved state`);
  } else {
    lines.push(`2. publish prepared scenario events`);
    lines.push(`3. watch relay activity and resolved state`);
  }
  lines.push("");
  lines.push("prepared actions:");

  input.actions.forEach((action, index) => {
    lines.push(`${index + 1}. ${action.title}`);
    lines.push(`   ${action.subtitle}`);
  });

  return lines.join("\n");
}

export function formatDemoCliSignupCard(input: {
  title: string;
  handle: string;
  bundlePath: string;
  relayCount: number;
}): string {
  return [
    `# ${input.title}`,
    "",
    `handle: ${input.handle}`,
    `bundle: ${input.bundlePath}`,
    `relays: ${input.relayCount}`,
    "",
    "flow:",
    "1. create key package",
    "2. set backup passphrase",
    "3. export encrypted backup",
    "4. publish 1776",
    "5. publish 1040",
  ].join("\n");
}

export function encodeNpub(pubkeyHex: string): string {
  return bech32.encode("npub", bech32.toWords(hexToBytes(pubkeyHex)), 1000);
}

export async function formatTerminalShareCard(input: {
  label: string;
  pubkeyHex: string;
}): Promise<string> {
  const npub = encodeNpub(input.pubkeyHex);
  const qr = await renderTerminalQr(npub);

  return [
    `# ${input.label}`,
    "",
    `pubkey: ${input.pubkeyHex}`,
    `npub:   ${npub}`,
    "",
    qr.trimEnd(),
  ].join("\n");
}

function renderTerminalQr(value: string): Promise<string> {
  return new Promise((resolve) => {
    qrcode.generate(value, { small: true }, (output) => resolve(output));
  });
}
