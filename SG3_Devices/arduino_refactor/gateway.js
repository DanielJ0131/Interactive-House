const admin = require("firebase-admin");
const { SerialPort } = require("serialport");

// FIREBASE
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

function getState(data, key) {
    if (data[key]?.state !== undefined) {
        return normalize(data[key].state);
    }
    if (data[`${key}.state`] !== undefined) {
        return normalize(data[`${key}.state`]);
    }
    return null;
}

function send(cmd, type) {
    if (!cmd) return;

    if (lastCommands[type] === cmd) return;

    lastCommands[type] = cmd;

    port.write(cmd + "\n");
    console.log("→", cmd);
}

// COMMAND MAPPING
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
        
        case "yellow_light":
            cmd = state === "on" ? "L:1" : "L:0";
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

        sendCommand("door", getState(data, "door"));
        sendCommand("window", getState(data, "window"));
        sendCommand("buzzer", getState(data, "buzzer"));
        sendCommand("fan_INA", getState(data, "fan_INA"));
        sendCommand("fan_INB", getState(data, "fan_INB"));
        sendCommand("white_light", getState(data, "white_light"));
        if (data.yellow_led?.value !== undefined) {
    const value = Math.max(0, Math.min(255, data.yellow_led.value));

    port.write(`YL:${value}\n`);
    console.log("→ YL:", value);
}
    });

// SERIAL RECEIVE
port.on("data", async (data) => {
    const msg = data.toString().trim();

    if (!msg.startsWith("STATE:")) return;

    const raw = msg.substring(6).split(",");

    let updates = {};

    raw.forEach(pair => {
        const [key, value] = pair.split("=");

        if (key === "door") {
            updates["door.state"] = value === "1" ? "open" : "close";
        }
        else if (key === "window") {
            updates["window.state"] = value === "1" ? "open" : "close";
        }
        else if (key === "fanINA") {
            updates["fan_INA.state"] = value === "1" ? "on" : "off";
        }
        else if (key === "fanINB") {
            updates["fan_INB.state"] = value === "1" ? "on" : "off";
        }
        else if (key === "light") {
            updates["white_light.state"] = value === "1" ? "on" : "off";
        }
        else if (key === "buzzer") {
            updates["buzzer.state"] = value === "1" ? "on" : "off";
        }
        else if (key === "yellowLED") {
            updates["yellow_led.value"] = parseInt(value);
        }
    });

    console.log("State updated:", updates);

    await db.collection("devices").doc("arduino").set(updates, { merge: true });

});

port.on("open", () => console.log("Serial connected"));
port.on("error", (err) => console.error("Serial error:", err.message));

console.log("Gateway running...");