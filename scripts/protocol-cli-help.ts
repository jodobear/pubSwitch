export function buildProtocolCliHelpText() {
  return `pubSwitch protocol CLI

Preferred operator workflows:
  prepared-migration --out-dir <dir> (--old-secret <hex> --migration-secret <hex> --next-migration-secret <hex> --new-secret <hex> | --bundle <file> | --bundle-dir <dir>) [--root-proof pending|bitcoin_confirmed] [--root-anchor-height <n>] [--root-proof-event <file>] [--root-proof-summary <file>] [--current-migration-secret <hex>] [--update-proof pending|bitcoin_confirmed] [--update-anchor-height <n>] [--update-proof-event <file>] [--update-proof-summary <file>] [--created-at-start <n>] [--publish] [--require-fully-relayable] [--watch-seconds <n>] [--relays <csv>] [--json]
  operate-transition (--prepared-bundle <file> | --prepared-bundle-dir <dir>) [--social-bundle <file> | --social-bundle-dir <dir>] [--publish] [--watch-seconds <n>] [--relays <csv>] [--require-fully-relayable] [--follow-pubkeys <csv>] [--trusted-pubkeys <csv>] [--json]

Social evidence:
  social-transition (--prepared-bundle <file> | --prepared-bundle-dir <dir> | --old-pubkey <hex> --new-pubkey <hex>) --signer-secret <hex> (--out <file> | --out-dir <dir>) [--social-bundle <file> | --social-bundle-dir <dir>] [--stance support|oppose|uncertain] [--method in_person|video|voice|website|nip05|chat|other] [--relays <csv>] [--follow-pubkeys <csv>] [--trusted-pubkeys <csv>] [--json]`;
}
