const admin = require("firebase-admin");
const { SerialPort } = require("serialport");

// FIREBASE SETUP
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// SERIAL
const port = new SerialPort({
    path: "COM3", // change if needed
    baudRate: 9600,
});

// BUFFER
let buffer = "";

// COMMAND CACHE
let lastCommands = {};

// HELPERS
function normalize(v) {
    if (v === undefined || v === null) return null;
    return String(v).toLowerCase().trim();
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

        console.log("Firestore update");

        sendCommand("door", data?.door?.state);
        sendCommand("window", data?.window?.state);
        sendCommand("buzzer", data?.buzzer?.state);
        sendCommand("fan_INA", data?.fan_INA?.state);
        sendCommand("fan_INB", data?.fan_INB?.state);
        sendCommand("white_light", data?.white_light?.state);

        // Yellow LED (value-based)
        if (data?.yellow_led?.value !== undefined) {
            const value = Math.max(0, Math.min(255, data.yellow_led.value));
            send(`YL:${value}`, "yellow_led");
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

        console.log("RAW:", msg);

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

            console.log("Sensors:", sensorData);

            await db.collection("devices").doc("arduino").set(
                {
                    telemetry: sensorData,
                },
                { merge: true }
            );
        }

        // DEVICE STATE
        if (msg.startsWith("STATE:")) {
            const parts = msg.substring(6).split(",");

            let updates = {};

            parts.forEach((p) => {
                const [key, value] = p.split("=");
                if (!key) return;

                switch (key) {
                    case "door":
                        updates.door = {
                            state: value === "1" ? "open" : "closed",
                        };
                        break;

                    case "window":
                        updates.window = {
                            state: value === "1" ? "open" : "closed",
                        };
                        break;

                    case "fanINA":
                        updates.fan_INA = {
                            state: value === "1" ? "on" : "off",
                        };
                        break;

                    case "fanINB":
                        updates.fan_INB = {
                            state: value === "1" ? "on" : "off",
                        };
                        break;

                    case "light":
                        updates.white_light = {
                            state: value === "1" ? "on" : "off",
                        };
                        break;

                    case "buzzer":
                        updates.buzzer = {
                            state: value === "1" ? "on" : "off",
                        };
                        break;

                    case "yellowLED":
                        updates.yellow_led = {
                            value: Number(value),
                        };
                        break;
                }
            });

            console.log("State updated:", updates);

            await db.collection("devices").doc("arduino").set(updates, {
                merge: true,
            });
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