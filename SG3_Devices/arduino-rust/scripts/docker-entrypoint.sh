#!/usr/bin/env bash
set -euo pipefail

APP_NAME="interactive-house-uno"
APP_DIR="${APP_DIR:-/workspace}"

cd "$APP_DIR"

build_hex() {
    cargo build --release

    local elf_path="target/avr-none/release/${APP_NAME}"
    local hex_path="target/avr-none/release/${APP_NAME}.hex"

    if command -v rust-objcopy >/dev/null 2>&1; then
        rust-objcopy -O ihex "$elf_path" "$hex_path"
    elif command -v avr-objcopy >/dev/null 2>&1; then
        avr-objcopy -O ihex -R .eeprom "$elf_path" "$hex_path"
    else
        echo "Error: missing objcopy tool inside container."
        exit 1
    fi

    echo "HEX ready: ${hex_path}"
}

show_help() {
    cat <<'EOF'
Firmware container commands:
  help            Show this help.
  check           Run cargo check for AVR target.
  build           Build release firmware.
  hex             Build release and produce .hex file.
  flash [PORT]    Build + flash to board (default /dev/ttyUSB0).
  shell           Open interactive bash shell.

Environment:
  ARDUINO_PORT    Serial device path (default /dev/ttyUSB0)
  ARDUINO_BAUD    Upload baud rate (default 115200)
EOF
}

cmd="${1:-help}"
case "$cmd" in
    help)
        show_help
        ;;
    check)
        cargo check
        ;;
    build)
        cargo build --release
        ;;
    hex)
        build_hex
        ;;
    flash)
        shift || true
        port="${1:-${ARDUINO_PORT:-/dev/ttyUSB0}}"
        ARDUINO_PORT="$port" bash ./scripts/flash.sh "$port"
        ;;
    shell)
        exec bash
        ;;
    *)
        exec "$@"
        ;;
esac
