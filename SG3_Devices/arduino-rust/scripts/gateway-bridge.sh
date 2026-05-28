#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
GATEWAY_DIR="${ROOT_DIR}/gateway"

CLI_SERIAL_PORT="${SERIAL_PORT-}"

cd "${GATEWAY_DIR}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
elif [[ -f config/.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source config/.env
  set +a
fi

if [[ ! -f runtime/control.json ]]; then
  cp runtime/control.example.json runtime/control.json
fi

if [[ -n "${CLI_SERIAL_PORT}" ]]; then
  SERIAL_PORT="${CLI_SERIAL_PORT}"
else
  SERIAL_PORT="tcp://127.0.0.1:7001"
fi

echo "Starting gateway with SERIAL_PORT=${SERIAL_PORT}"
exec env SERIAL_PORT="${SERIAL_PORT}" cargo run --bin smarthouse-gateway-rust
