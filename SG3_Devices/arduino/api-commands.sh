#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5050}"

json_post() {
  local path="$1"
  local data="$2"

  curl -sS -X POST "${BASE_URL}${path}" \
    -H "Content-Type: application/json" \
    -d "$data"
}

health() {
  curl -sS "${BASE_URL}/health"
}

command() {
  local cmd="$1"
  json_post "/command" "{\"command\":\"${cmd}\"}"
}

door_open() { json_post "/door/open" '{}'; }
door_close() { json_post "/door/close" '{}'; }
window_open() { json_post "/window/open" '{}'; }
window_close() { json_post "/window/close" '{}'; }
buzzer_on() { json_post "/buzzer/on" '{}'; }
buzzer_off() { json_post "/buzzer/off" '{}'; }
fan_ina_on() { json_post "/fan-ina/on" '{}'; }
fan_ina_off() { json_post "/fan-ina/off" '{}'; }
fan_inb_on() { json_post "/fan-inb/on" '{}'; }
fan_inb_off() { json_post "/fan-inb/off" '{}'; }
white_light_on() { json_post "/white-light/on" '{}'; }
white_light_off() { json_post "/white-light/off" '{}'; }

orange_light() {
  local value="${1:?usage: orange_light <0-255>}"
  json_post "/orange-light" "{\"value\":${value}}"
}

music_play() {
  json_post "/music/play" "${1:-{\"notes\":[{\"frequency\":262,\"duration\":250},{\"frequency\":294,\"duration\":250},{\"frequency\":330,\"duration\":500}]}}"
}

music_stop() { json_post "/music/stop" '{}'; }

usage() {
  cat <<'EOF'
Usage:
  BASE_URL=http://localhost:5050 ./api-commands.sh <command> [args]

Commands:
  health
  command "D:1"
  door_open
  door_close
  window_open
  window_close
  buzzer_on
  buzzer_off
  fan_ina_on
  fan_ina_off
  fan_inb_on
  fan_inb_off
  white_light_on
  white_light_off
  orange_light 128
  music_play
  music_stop
EOF
}

case "${1:-}" in
  health)
    health
    ;;
  command)
    command "${2:-}"
    ;;
  door_open)
    door_open
    ;;
  door_close)
    door_close
    ;;
  window_open)
    window_open
    ;;
  window_close)
    window_close
    ;;
  buzzer_on)
    buzzer_on
    ;;
  buzzer_off)
    buzzer_off
    ;;
  fan_ina_on)
    fan_ina_on
    ;;
  fan_ina_off)
    fan_ina_off
    ;;
  fan_inb_on)
    fan_inb_on
    ;;
  fan_inb_off)
    fan_inb_off
    ;;
  white_light_on)
    white_light_on
    ;;
  white_light_off)
    white_light_off
    ;;
  orange_light)
    orange_light "${2:-}"
    ;;
  music_play)
    music_play "${2:-}"
    ;;
  music_stop)
    music_stop
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac