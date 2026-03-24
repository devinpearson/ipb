#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
set -a
source "${SCRIPT_DIR}/../tapes/fixtures/credentials.env"
set +a
export IPB_MOCK_APIS=1
export IPB_NO_UPDATE_CHECK=1
vhs tapes/cards.tape
vhs tapes/deploy.tape
vhs tapes/env.tape
vhs tapes/fetch.tape
vhs tapes/logs.tape
vhs tapes/new.tape
vhs tapes/publish.tape
vhs tapes/published.tape
vhs tapes/run.tape
vhs tapes/simulate.tape
vhs tapes/toggle.tape
vhs tapes/upload-env.tape
vhs tapes/upload.tape
vhs tapes/accounts.tape
vhs tapes/beneficiaries.tape
vhs tapes/balances.tape
vhs tapes/transactions.tape
vhs tapes/pay.tape
vhs tapes/transfer.tape
