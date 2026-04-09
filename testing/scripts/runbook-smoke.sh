#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "${SCRIPT_DIR}/../.." && pwd)
eval "$("${SCRIPT_DIR}/setup-env.sh")"

cd "${PUBSWITCH_REPO_ROOT}"
mkdir -p "${PUBSWITCH_RESULTS_DIR}"

run_json() {
  local output_path="$1"
  shift
  "$@" >"${output_path}"
}

assert_json() {
  local file_path="$1"
  local script="$2"
  bun -e "const fs=require('node:fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); ${script}" "${file_path}"
}

prepared_json="${PUBSWITCH_RESULTS_DIR}/prepared-migration.json"
claim_json="${PUBSWITCH_RESULTS_DIR}/social-claim.json"
attest_json="${PUBSWITCH_RESULTS_DIR}/social-attest.json"
operate_json="${PUBSWITCH_RESULTS_DIR}/operate-transition.json"

run_json "${prepared_json}" \
  bun run cli prepared-migration \
  --old-secret "${PUBSWITCH_OLD_SECRET}" \
  --migration-secret "${PUBSWITCH_MIGRATION_SECRET}" \
  --next-migration-secret "${PUBSWITCH_NEXT_MIGRATION_SECRET}" \
  --new-secret "${PUBSWITCH_NEW_SECRET}" \
  --root-proof bitcoin_confirmed \
  --root-anchor-height 840260 \
  --update-proof bitcoin_confirmed \
  --update-anchor-height 840261 \
  --relays wss://relay.prepared \
  --out-dir "${PUBSWITCH_PREPARED_DIR}" \
  --json

assert_json "${prepared_json}" '
if (!data.ok) throw new Error("prepared-migration did not succeed");
if (data.command !== "prepared-migration") throw new Error("unexpected command");
if (data.mode !== "start") throw new Error("unexpected prepared mode");
if (data.stage !== "prepared_migrated") throw new Error("prepared stage did not reach prepared_migrated");
'

run_json "${claim_json}" \
  bun run cli social-transition \
  --prepared-bundle-dir "${PUBSWITCH_PREPARED_DIR}" \
  --signer-secret "${PUBSWITCH_OLD_SECRET}" \
  --relays wss://relay.social \
  --out-dir "${PUBSWITCH_SOCIAL_DIR}" \
  --json

assert_json "${claim_json}" '
if (!data.ok) throw new Error("social claim did not succeed");
if (data.command !== "social-transition") throw new Error("unexpected social command");
if (data.mode !== "claim") throw new Error("unexpected social claim mode");
if (data.operatorReport.state.state !== "claimed") throw new Error("social claim did not reach claimed");
'

run_json "${attest_json}" \
  bun run cli social-transition \
  --prepared-bundle-dir "${PUBSWITCH_PREPARED_DIR}" \
  --social-bundle-dir "${PUBSWITCH_SOCIAL_DIR}" \
  --signer-secret "${PUBSWITCH_ATTESTOR_SECRET}" \
  --stance support \
  --follow-pubkeys "${PUBSWITCH_ATTESTOR_PUBKEY}" \
  --out-dir "${PUBSWITCH_SOCIAL_DIR}" \
  --json

assert_json "${attest_json}" '
if (!data.ok) throw new Error("social attestation did not succeed");
if (data.command !== "social-transition") throw new Error("unexpected social command");
if (data.mode !== "attest") throw new Error("unexpected social attest mode");
if (data.operatorReport.state.state !== "socially_supported") throw new Error("social attestation did not reach socially_supported");
'

run_json "${operate_json}" \
  bun run cli operate-transition \
  --prepared-bundle-dir "${PUBSWITCH_PREPARED_DIR}" \
  --social-bundle-dir "${PUBSWITCH_SOCIAL_DIR}" \
  --follow-pubkeys "${PUBSWITCH_ATTESTOR_PUBKEY}" \
  --json

assert_json "${operate_json}" '
if (!data.ok) throw new Error("operate-transition did not succeed");
if (data.command !== "operate-transition") throw new Error("unexpected operate command");
if (data.inspection.prepared.state !== "prepared_migrated") throw new Error("prepared inspection state mismatch");
if (data.inspection.social.state !== "socially_supported") throw new Error("social inspection state mismatch");
if (data.inspection.socialAdvice.nextAction !== "review_support") throw new Error("unexpected social advice");
'

cat <<EOF
runbook_smoke=ok
prepared_dir=${PUBSWITCH_PREPARED_DIR}
social_dir=${PUBSWITCH_SOCIAL_DIR}
results_dir=${PUBSWITCH_RESULTS_DIR}
prepared_json=${prepared_json}
claim_json=${claim_json}
attest_json=${attest_json}
operate_json=${operate_json}
EOF
