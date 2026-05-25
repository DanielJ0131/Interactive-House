# SmartHouse Gateway (Rust)

This is a Rust rewrite of the Gateway.

## Rust parity modules

- `src/serial_client.rs`: Rust equivalent of Python `serial_client.py`
- `src/firestore_watch_toggle.rs`: Rust equivalent of Python `firestore_watch_toggle.py`

## What this implementation does

- Opens Arduino serial port (`SERIAL_PORT`, `SERIAL_BAUD`)
  - `SERIAL_PORT` supports both real serial paths (for example `/dev/ttyUSB0`) and TCP bridge endpoints (for example `tcp://127.0.0.1:7001`)
- Reads Arduino lines continuously
- Parses `STATE key=value ...` lines
- Writes parsed telemetry to JSON file (`STATE_FILE`)
- Emits the same command family to Arduino (`X`, `Y`, `D:1/0`, `N:1/0`, `B:1/0`, `P:1/0`, `W`, `O:n`, `M...|`)
- Supports two runtime modes:
  - Firestore mode (when `PROJECT_ID`, `WATCH_DOC`, and `SERVICE_ACCOUNT_PATH` are set)
  - File control mode fallback (`CONTROL_FILE` polling)

## Rust-only simulator (no HTML/CSS/JS)

Run the terminal UI simulator:

```bash
cargo run --bin simulator
```

To expose the simulator as a gateway target (serial bridge over TCP):

```bash
SIM_LISTEN=127.0.0.1:7001 cargo run --bin simulator
```

Then point the gateway to it:

```bash
SERIAL_PORT=tcp://127.0.0.1:7001 cargo run
```

This lets Firestore drive the gateway while the simulator renders state changes in the TUI.

Key controls:

- `q`: quit
- `i`: command input mode, then type and press Enter
- `x y d n b w o m`: quick actuator commands
- `1 2 3 4`: explicit door/window open/close
- `j / k`: select sensor
- `+ / -`: adjust selected sensor
- `g`: gas alarm scenario
- `r`: reset sensors

## Quick start

1. Copy env template:

```bash
cp config/.env.example config/.env
```

2. Copy control template:

```bash
cp runtime/control.example.json runtime/control.json
```

3. Run gateway:

```bash
cargo run
```

4. Edit `runtime/control.json` while running. The gateway detects changes and sends matching commands.

5. Observe parsed Arduino state in:

- `runtime/last_state.json`
