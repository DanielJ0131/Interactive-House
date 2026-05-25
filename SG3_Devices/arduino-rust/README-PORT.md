# Interactive House Arduino Rust Port

This folder contains a Rust rewrite of the Arduino UNO firmware from the C++ sketch.

## What Is Included

- Sensor reads on A0-A3 (gas, light, soil, steam)
- Motion input on D2
- Buttons on D4 and D8 (pull-up, active-low)
- Outputs on D3, D5, D6, D7, D12, D13
- LCD1602 (I2C backpack at 0x27)
- Servo control on D9 and D10 using software pulse generation

## Notes

- The servo implementation is software-driven and intentionally simple for portability.
- The LCD driver is implemented inline for common PCF8574 backpacks.

## Rust-Only Workflow (No PlatformIO)

You can build and flash this firmware without PlatformIO.

### 1. Install required tools (Linux)

```bash
sudo apt update
sudo apt install avrdude binutils-avr
rustup toolchain install nightly
rustup component add rust-src --toolchain nightly
```

Optional alternative to `avr-objcopy`:

```bash
cargo +nightly install cargo-binutils
rustup component add llvm-tools-preview --toolchain nightly
```

### 2. Build check

```bash
cargo check
```

### 3. Flash to Keyestudio Arduino Uno

Use the helper script:

```bash
./scripts/flash.sh /dev/ttyUSB0
```

Notes:

- Keyestudio Uno boards usually appear as `/dev/ttyUSB0` on Linux.
- Default baud in the script is `115200` (Optiboot-compatible).
- If your board uses an older bootloader, try `57600`:

```bash
ARDUINO_BAUD=57600 ./scripts/flash.sh /dev/ttyUSB0
```

### 4. Serial monitor

Open serial monitor at `9600` baud to match firmware logging.

```bash
screen /dev/ttyUSB0 9600
```

Exit `screen` with `Ctrl+A`, then `K`, then `Y`.

## Docker Workflow

This project includes a Docker image so you can build and flash without installing the AVR toolchain on your host.

### 1. Build the image

```bash
docker build -t interactive-house-uno:dev .
```

### 2. Run checks and builds

```bash
docker run --rm -v "$PWD":/workspace interactive-house-uno:dev check
docker run --rm -v "$PWD":/workspace interactive-house-uno:dev build
docker run --rm -v "$PWD":/workspace interactive-house-uno:dev hex
```

### 3. Flash Keyestudio Arduino Uno from Docker

```bash
docker run --rm \
	--device=/dev/ttyUSB0 \
	-v "$PWD":/workspace \
	-e ARDUINO_PORT=/dev/ttyUSB0 \
	interactive-house-uno:dev flash
```

If your board uses the old bootloader baud:

```bash
docker run --rm \
	--device=/dev/ttyUSB0 \
	-v "$PWD":/workspace \
	-e ARDUINO_PORT=/dev/ttyUSB0 \
	-e ARDUINO_BAUD=57600 \
	interactive-house-uno:dev flash
```

### 4. Container command reference

```bash
docker run --rm -v "$PWD":/workspace interactive-house-uno:dev help
```

Supported commands:

- `check`
- `build`
- `hex`
- `flash [PORT]`
- `shell`
