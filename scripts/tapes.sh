#!/usr/bin/env bash
set -euo pipefail

# Ctrl+C / SIGTERM should stop the whole suite, not just the current vhs.
trap 'printf "\nInterrupted — stopping tape generation.\n" >&2; exit 130' INT TERM

export DEBUG=true
export IPB_NO_UPDATE_CHECK="${IPB_NO_UPDATE_CHECK:-1}"

# npm link points the global `ipb` at ./bin/index.js; tsc emits without +x.
if [[ ! -x ./bin/index.js ]]; then
  chmod +x ./bin/index.js
fi
if ! command -v ipb >/dev/null 2>&1; then
  printf 'ipb is not on PATH. Run npm link after building.\n' >&2
  exit 1
fi
if ! ipb --version >/dev/null 2>&1; then
  printf 'Linked ipb is not executable (permission denied). Fixing ./bin/index.js and retrying.\n' >&2
  chmod +x ./bin/index.js
  ipb --version >/dev/null
fi

tapes=(
  cards
  deploy
  env
  fetch
  logs
  new
  publish
  published
  run
  simulate
  toggle
  upload-env
  upload
  accounts
  beneficiaries
  balances
  transactions
  pay
  transfer
)

for name in "${tapes[@]}"; do
  printf 'Recording tapes/%s.tape...\n' "$name"
  # Run in foreground process group so SIGINT reaches vhs.
  vhs "tapes/${name}.tape"
done
