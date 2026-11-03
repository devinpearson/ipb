#!/usr/bin/env bash
# Runs a built ipb (bundle or standalone binary) through commands that need no bank account,
# to catch packaging mistakes such as missing templates or broken file lookups.
# Usage: scripts/smoke-test.sh "node dist-bundle/index.cjs"   or   scripts/smoke-test.sh ./dist/investec-ipb-linux-x64
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <ipb command>" >&2
  exit 2
fi
read -r -a IPB <<<"$1"
# Make file arguments absolute, since the commands run from a temp folder.
for i in "${!IPB[@]}"; do
  if [ -e "${IPB[$i]}" ]; then
    IPB[$i]="$(cd "$(dirname "${IPB[$i]}")" && pwd)/$(basename "${IPB[$i]}")"
  fi
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"

# Never read or write the real ~/.ipb.
export HOME="$work/home"
export IPB_NO_UPDATE_CHECK=1
mkdir -p "$HOME"

step() { echo "▶ ipb $*"; }

step --version
"${IPB[@]}" --version

step --help
"${IPB[@]}" --help >/dev/null

step env-list
"${IPB[@]}" env-list >/dev/null

for template in default petro; do
  step new "demo-$template" --template "$template"
  "${IPB[@]}" new "demo-$template" --template "$template" --no-spinner >/dev/null
  test -f "demo-$template/main.js"
  test -f "demo-$template/.env.prod"
done

step run -f demo-default/main.js
"${IPB[@]}" run -f demo-default/main.js --no-spinner >/dev/null

step accounts --json "(mock APIs)"
IPB_MOCK_APIS=1 INVESTEC_CLIENT_ID=smoke INVESTEC_CLIENT_SECRET=smoke INVESTEC_API_KEY=smoke \
  "${IPB[@]}" accounts --json 2>/dev/null | grep -q accountId

step "pay (read-only mode refuses)"
if IPB_READ_ONLY=1 IPB_MOCK_APIS=1 INVESTEC_CLIENT_ID=smoke INVESTEC_CLIENT_SECRET=smoke INVESTEC_API_KEY=smoke \
  "${IPB[@]}" pay acc-1 benef-1 10 smoke --yes --json 2>"$work/pay.err"; then
  echo "pay should have been refused in read-only mode" >&2
  exit 1
fi
grep -q READ_ONLY "$work/pay.err"

test ! -e "$HOME/.ipb/.credentials.json"
echo "✅ Smoke test passed"
