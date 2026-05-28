#!/usr/bin/env bash
set -euo pipefail

APP_NAME="interactive-house-uno"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-${ARDUINO_PORT:-/dev/ttyUSB0}}"
BAUD="${ARDUINO_BAUD:-115200}"
MCU="atmega328p"
PROGRAMMER="arduino"

cd "$ROOT_DIR"

cargo build --release

ELF_PATH="target/avr-none/release/${APP_NAME}"
HEX_PATH="target/avr-none/release/${APP_NAME}.hex"

if command -v rust-objcopy >/dev/null 2>&1; then
    rust-objcopy -O ihex "$ELF_PATH" "$HEX_PATH"
elif command -v avr-objcopy >/dev/null 2>&1; then
    avr-objcopy -O ihex -R .eeprom "$ELF_PATH" "$HEX_PATH"
else
    echo "Error: missing objcopy tool. Install one of:"
    echo "  1) rust-objcopy (cargo-binutils + llvm-tools-preview)"
    echo "  2) avr-objcopy (binutils-avr package)"
    exit 1
fi

if ! command -v avrdude >/dev/null 2>&1; then
    echo "Error: avrdude is not installed."
    echo "Install it with your package manager (for example: sudo apt install avrdude)."
    exit 1
fi

avrdude \
    -p "$MCU" \
    -c "$PROGRAMMER" \
    -P "$PORT" \
    -b "$BAUD" \
    -D \
    -U "flash:w:${HEX_PATH}:i"

echo "Flashed ${APP_NAME} to ${PORT} at ${BAUD} baud."
