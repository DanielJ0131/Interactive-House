#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
GATEWAY_DIR="${ROOT_DIR}/gateway"

SIM_LISTEN="${SIM_LISTEN:-127.0.0.1:7001}"

cd "${GATEWAY_DIR}"
echo "Starting simulator bridge on ${SIM_LISTEN}"
exec env SIM_LISTEN="${SIM_LISTEN}" cargo run --bin simulator
