import type { NostrEvent } from "@tack/protocol-shared";

export type PublishFn = (event: NostrEvent, relays?: string[]) => Promise<void>;

export type DemoAppContext = {
  eventStore: unknown;
  relayPool: unknown;
  publish: PublishFn;
};

export function createUnwiredDemoAppContext(): DemoAppContext {
  return {
    eventStore: null,
    relayPool: null,
    publish: async () => {
      throw new Error("Demo app context is not wired yet");
    },
  };
}
