#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "${SCRIPT_DIR}/../.." && pwd)
eval "$("${SCRIPT_DIR}/setup-env.sh")"
cd "${PUBSWITCH_REPO_ROOT}"

usage() {
  cat <<EOF
usage:
  testing/scripts/relay-operator.sh inspect [extra operate-transition args...]
  testing/scripts/relay-operator.sh publish --relays <csv> [extra operate-transition args...]
  testing/scripts/relay-operator.sh watch --watch-seconds <n> --relays <csv> [extra operate-transition args...]
  testing/scripts/relay-operator.sh publish-watch --watch-seconds <n> --relays <csv> [extra operate-transition args...]

defaults:
  prepared bundle dir: ${PUBSWITCH_PREPARED_DIR}
  social bundle dir:   ${PUBSWITCH_SOCIAL_DIR}
  follow pubkeys:      ${PUBSWITCH_ATTESTOR_PUBKEY}

examples:
  testing/scripts/relay-operator.sh inspect
  testing/scripts/relay-operator.sh publish --relays wss://relay.one,wss://relay.two
  testing/scripts/relay-operator.sh publish-watch --relays wss://relay.one --watch-seconds 8
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

mode="$1"
shift

base_args=(
  bun run cli operate-transition
  --prepared-bundle-dir "${PUBSWITCH_PREPARED_DIR}"
  --social-bundle-dir "${PUBSWITCH_SOCIAL_DIR}"
  --follow-pubkeys "${PUBSWITCH_ATTESTOR_PUBKEY}"
)

case "${mode}" in
  inspect)
    exec "${base_args[@]}" "$@"
    ;;
  publish)
    exec "${base_args[@]}" --publish "$@"
    ;;
  watch)
    exec "${base_args[@]}" "$@"
    ;;
  publish-watch)
    exec "${base_args[@]}" --publish "$@"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "unknown mode: ${mode}" >&2
    usage >&2
    exit 1
    ;;
esac
