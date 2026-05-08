const admin = require("firebase-admin");
const { SerialPort } = require("serialport");

require("dotenv").config({ path: "config/.env" });

// FIREBASE SETUP
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// SERIAL
const serialPath = process.env.SERIAL_PORT;
const serialBaudRate = Number(process.env.SERIAL_BAUD);

if (!serialPath) {
    console.error("Missing SERIAL_PORT in config/.env");
    process.exit(1);
}

if (!Number.isFinite(serialBaudRate) || serialBaudRate <= 0) {
    console.error("Invalid SERIAL_BAUD in config/.env");
    process.exit(1);
}

const port = new SerialPort({
    path: serialPath,
    baudRate: serialBaudRate,
});

// BUFFER
let buffer = "";

// COMMAND CACHE
let lastCommands = {};
let lastDeviceState = {};
let lastTelemetry = {};
let lastFirestoreCommandState = {};

// HELPERS
function normalize(v) {
    if (v === undefined || v === null) return null;
    return String(v).toLowerCase().trim();
}

function hasChanges(prev, next) {
    return Object.keys(next).some((key) => prev[key] !== next[key]);
}

function getDeviceFieldValue(key, state) {
    const entry = state[key];
    if (!entry) return undefined;
    return entry.state !== undefined ? entry.state : entry.value;
}

function getFirestoreCommandState(data) {
    return {
        door: data?.door?.state,
        window: data?.window?.state,
        buzzer: data?.buzzer?.state,
        fan_INA: data?.fan_INA?.state,
        fan_INB: data?.fan_INB?.state,
        white_light: data?.white_light?.state,
        orange_light: data?.orange_light?.value,
    };
}

function send(cmd, type) {
    if (!cmd) return;

    if (lastCommands[type] === cmd) return;

    lastCommands[type] = cmd;
    port.write(cmd + "\n");

    console.log("→", cmd);
}

//  FIREBASE COMMANDS --> SERIAL DATA TO ARDUINO
function sendCommand(type, state) {
    state = normalize(state);
    if (state === null) return;

    let cmd = null;

    switch (type) {
        case "door":
            cmd = state === "open" ? "D:1" : "D:0";
            break;

        case "window":
            cmd = state === "open" ? "N:1" : "N:0";
            break;

        case "buzzer":
            cmd = state === "on" ? "B:1" : "B:0";
            break;

        case "fan_INA":
            cmd = state === "on" ? "X:1" : "X:0";
            break;

        case "fan_INB":
            cmd = state === "on" ? "Y:1" : "Y:0";
            break;

        case "white_light":
            cmd = state === "on" ? "W:1" : "W:0";
            break;
    }

    send(cmd, type);
}

// FIRESTORE LISTENER
db.collection("devices")
    .doc("arduino")
    .onSnapshot((doc) => {
        const data = doc.data();
        if (!data) return;

        const currentCommandState = getFirestoreCommandState(data);
        if (!hasChanges(lastFirestoreCommandState, currentCommandState)) {
            return;
        }

        lastFirestoreCommandState = currentCommandState;
        console.log("Firestore command update");

        sendCommand("door", data?.door?.state);
        sendCommand("window", data?.window?.state);
        sendCommand("buzzer", data?.buzzer?.state);
        sendCommand("fan_INA", data?.fan_INA?.state);
        sendCommand("fan_INB", data?.fan_INB?.state);
        sendCommand("white_light", data?.white_light?.state);

        // Orange light (value-based)
        if (data?.orange_light?.value !== undefined) {
            const value = Math.max(0, Math.min(255, data.orange_light.value));
            send(`YL:${value}`, "orange_light");
        }
    });

// SERIAL DATA FROM ARDUINO --> FIRESTORE
port.on("data", async (data) => {
    buffer += data.toString();

    // wait until full line received
    if (!buffer.includes("\n")) return;

    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep unfinished part in buffer

    for (const raw of lines) {
        const msg = raw.trim();
        if (!msg) continue;

        // SENSOR DATA
        if (msg.startsWith("S:")) {
            const parts = msg.substring(2).split(",");

            if (parts.length < 5) {
                console.log("Bad sensor data:", msg);
                continue;
            }

            const sensorData = {
                gas: Number(parts[0]),
                light: Number(parts[1]),
                soil: Number(parts[2]),
                steam: Number(parts[3]),
                motion: Number(parts[4]),
            };

            if (hasChanges(lastTelemetry, sensorData)) {
                lastTelemetry = sensorData;
                console.log("Sensors:", sensorData);

                await db.collection("devices").doc("arduino").set(
                    {
                        telemetry: sensorData,
                    },
                    { merge: true }
                );
            }
        }

        // DEVICE STATE
        if (msg.startsWith("STATE:")) {
            const parts = msg.substring(6).split(",");

            let updates = {};
            let changed = false;

            parts.forEach((p) => {
                const [key, value] = p.split("=");
                if (!key) return;

                switch (key) {
                    case "door": {
                        const nextState = value === "1" ? "open" : "closed";
                        if (getDeviceFieldValue("door", lastDeviceState) !== nextState) {
                            updates.door = { state: nextState };
                            changed = true;
                        }
                        break;
                    }

                    case "window": {
                        const nextState = value === "1" ? "open" : "closed";
                        if (getDeviceFieldValue("window", lastDeviceState) !== nextState) {
                            updates.window = { state: nextState };
                            changed = true;
                        }
                        break;
                    }

                    case "fanINA": {
                        const nextState = value === "1" ? "on" : "off";
                        if (getDeviceFieldValue("fan_INA", lastDeviceState) !== nextState) {
                            updates.fan_INA = { state: nextState };
                            changed = true;
                        }
                        break;
                    }

                    case "fanINB": {
                        const nextState = value === "1" ? "on" : "off";
                        if (getDeviceFieldValue("fan_INB", lastDeviceState) !== nextState) {
                            updates.fan_INB = { state: nextState };
                            changed = true;
                        }
                        break;
                    }

                    case "light": {
                        const nextState = value === "1" ? "on" : "off";
                        if (getDeviceFieldValue("white_light", lastDeviceState) !== nextState) {
                            updates.white_light = { state: nextState };
                            changed = true;
                        }
                        break;
                    }

                    case "buzzer": {
                        const nextState = value === "1" ? "on" : "off";
                        if (getDeviceFieldValue("buzzer", lastDeviceState) !== nextState) {
                            updates.buzzer = { state: nextState };
                            changed = true;
                        }
                        break;
                    }

                    case "orange_light": {
                        const nextValue = Number(value);
                        if (getDeviceFieldValue("orange_light", lastDeviceState) !== nextValue) {
                            updates.orange_light = { value: nextValue };
                            changed = true;
                        }
                        break;
                    }
                }
            });

            if (changed) {
                lastDeviceState = {
                    ...lastDeviceState,
                    ...updates,
                };

                console.log("State updated:", updates);

                await db.collection("devices").doc("arduino").set(updates, {
                    merge: true,
                });
            }
        }
    }
});

// SERIAL EVENTS
port.on("open", () => {
    console.log(" Serial connected");
});

port.on("error", (err) => {
    console.error(" Serial error:", err.message);
});

// START GATEWAY
console.log(" Firestore Gateway Running...");