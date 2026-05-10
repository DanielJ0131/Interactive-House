const admin = require("firebase-admin");
const { SerialPort } = require("serialport");

require("dotenv").config({ path: "config/.env" });

const watchDocPath = process.env.WATCH_DOC || "devices/arduino";
const watchMusicPath = process.env.WATCH_DOC_MUSIC
    ? process.env.WATCH_DOC_MUSIC.trim()
    : "";
const MAX_MUSIC_NOTES = 100;
const musicKeepLastOnRaw = (process.env.MUSIC_KEEP_LAST_ON || "").trim().toLowerCase();
const MUSIC_KEEP_LAST_ON = ["1", "true", "yes", "on"].includes(musicKeepLastOnRaw);
const musicStopGraceMsRaw = Number(process.env.MUSIC_STOP_GRACE_MS ?? 0);
const MUSIC_STOP_GRACE_MS = Number.isFinite(musicStopGraceMsRaw)
    ? Math.max(0, musicStopGraceMsRaw)
    : 0;

// FIREBASE SETUP
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const deviceDocRef = db.doc(watchDocPath);

const musicPathSegments = watchMusicPath
    ? watchMusicPath.split("/").filter(Boolean)
    : [];
const isMusicDocPath = musicPathSegments.length > 0 && musicPathSegments.length % 2 === 0;
const musicDocRef = isMusicDocPath ? db.doc(watchMusicPath) : null;
const musicCollectionRef = !isMusicDocPath && watchMusicPath
    ? db.collection(watchMusicPath)
    : null;

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
let lastMusicState = { notesKey: "", play: null };
let lastMusicDocId = null;
let pendingMusicStop = null;

// HELPERS
function normalize(v) {
    if (v === undefined || v === null) return null;
    return String(v).toLowerCase().trim();
}

function normalizeBoolean(v) {
    if (typeof v === "boolean") return v;

    const n = normalize(v);
    if (n === null) return null;

    if (["1", "true", "on", "play", "playing", "start"].includes(n)) return true;
    if (["0", "false", "off", "stop", "stopped"].includes(n)) return false;

    return null;
}

function toNumber(v) {
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
}

function clampInt(v, min, max) {
    return Math.min(max, Math.max(min, Math.round(v)));
}

function parseNotesFromString(raw) {
    const parts = raw
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean);

    const notes = [];

    for (const part of parts) {
        const [noteRaw, durRaw] = part.split(/[,:]/).map((p) => p.trim());
        const note = toNumber(noteRaw);
        const dur = toNumber(durRaw);

        if (note === null || dur === null) continue;

        notes.push({
            note: clampInt(note, 0, 20000),
            duration: clampInt(dur, 1, 60000),
        });

        if (notes.length >= MAX_MUSIC_NOTES) break;
    }

    return notes;
}

function parseNotesFromArrays(frequencies, delays) {
    if (!Array.isArray(frequencies) || !Array.isArray(delays)) return [];

    const notes = [];
    const limit = Math.min(frequencies.length, delays.length, MAX_MUSIC_NOTES);

    for (let i = 0; i < limit; i++) {
        const note = toNumber(frequencies[i]);
        const dur = toNumber(delays[i]);

        if (note === null || dur === null) continue;

        notes.push({
            note: clampInt(note, 0, 20000),
            duration: clampInt(dur, 1, 60000),
        });
    }

    return notes;
}

function parseNotes(raw) {
    if (!raw) return [];

    if (typeof raw === "string") {
        return parseNotesFromString(raw);
    }

    if (!Array.isArray(raw)) return [];

    const notes = [];

    for (const entry of raw) {
        let note = null;
        let duration = null;

        if (Array.isArray(entry) && entry.length >= 2) {
            note = toNumber(entry[0]);
            duration = toNumber(entry[1]);
        } else if (entry && typeof entry === "object") {
            note = toNumber(entry.note ?? entry.freq ?? entry.n);
            duration = toNumber(entry.duration ?? entry.dur ?? entry.d);
        } else if (typeof entry === "string") {
            const parsed = parseNotesFromString(entry);
            if (parsed.length) {
                notes.push(...parsed);
                continue;
            }
        }

        if (note === null || duration === null) continue;

        notes.push({
            note: clampInt(note, 0, 20000),
            duration: clampInt(duration, 1, 60000),
        });

        if (notes.length >= MAX_MUSIC_NOTES) break;
    }

    return notes;
}

function serializeNotes(notes) {
    return notes.map((n) => `${n.note}:${n.duration}`).join("|");
}

function applyMusicStop() {
    writeLine("P:0");
    lastMusicState = { notesKey: "", play: false };
    lastMusicDocId = null;
}

function clearPendingMusicStop() {
    if (pendingMusicStop) {
        clearTimeout(pendingMusicStop);
        pendingMusicStop = null;
    }
}

function scheduleMusicStop() {
    if (lastMusicState.play === false && lastMusicDocId === null) return;

    if (MUSIC_STOP_GRACE_MS === 0) {
        applyMusicStop();
        return;
    }

    if (pendingMusicStop) return;

    pendingMusicStop = setTimeout(() => {
        pendingMusicStop = null;
        applyMusicStop();
    }, MUSIC_STOP_GRACE_MS);
}

function toTimestampMillis(value) {
    if (!value) return 0;

    if (typeof value.toMillis === "function") return value.toMillis();

    if (typeof value.seconds === "number") {
        const nanos = typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
        return value.seconds * 1000 + Math.floor(nanos / 1e6);
    }

    if (value instanceof Date) return value.getTime();

    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
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

function getMusicState(data) {
    const playValue =
        data?.play ??
        data?.playing ??
        data?.state ??
        data?.action ??
        data?.command;

    const play = normalizeBoolean(playValue);

    const frequencies = data?.frequencies ?? data?.freqs;
    const noteDelays =
        data?.noteDelays ??
        data?.note_delays ??
        data?.durations ??
        data?.delays;

    let notes = [];
    if (Array.isArray(frequencies) && Array.isArray(noteDelays)) {
        notes = parseNotesFromArrays(frequencies, noteDelays);
    } else {
        const rawNotes =
            data?.notes ??
            data?.melody ??
            data?.sequence ??
            data?.song;

        notes = parseNotes(rawNotes);
    }

    return { play, notes };
}

function send(cmd, type) {
    if (!cmd) return;

    if (lastCommands[type] === cmd) return;

    lastCommands[type] = cmd;
    port.write(cmd + "\n");

    console.log("→", cmd);
}

function writeLine(cmd) {
    if (!cmd) return;

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
deviceDocRef.onSnapshot((doc) => {
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

if (musicDocRef) {
    musicDocRef.onSnapshot((doc) => {
        const data = doc.data();
        if (!data) return;

        const { notes, play } = getMusicState(data);
        const notesKey = serializeNotes(notes);
        const notesChanged = notesKey !== lastMusicState.notesKey;

        const hasPlayValue = play !== null;
        let nextPlay = play;
        if (nextPlay === null) {
            nextPlay = lastMusicState.play !== null ? lastMusicState.play : true;
        }

        const playChanged = hasPlayValue && play !== lastMusicState.play;

        if (!notesChanged && !playChanged) return;

        console.log("Firestore music update");

        if (notesChanged) {
            writeLine("C");

            for (const note of notes) {
                writeLine(`A:${note.note},${note.duration}`);
            }

            if (notes.length > 0) {
                writeLine("E");
            }
        }

        if (nextPlay !== null && (notesChanged || playChanged)) {
            writeLine(nextPlay ? "P:1" : "P:0");
        }

        lastMusicState = {
            notesKey,
            play: hasPlayValue ? play : nextPlay,
        };
        lastMusicDocId = doc.id;
    });
}

if (musicCollectionRef) {
    musicCollectionRef.onSnapshot((snapshot) => {
        const candidates = [];

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data) return;

            const { notes, play } = getMusicState(data);
            if (play !== true) return;

            candidates.push({
                id: docSnap.id,
                notes,
                play,
                updatedAt: toTimestampMillis(data?.updatedAt),
            });
        });

        if (candidates.length === 0) {
            if (MUSIC_KEEP_LAST_ON) {
                clearPendingMusicStop();
                return;
            }

            scheduleMusicStop();
            return;
        }

        clearPendingMusicStop();

        const active = candidates.reduce((best, current) =>
            current.updatedAt > best.updatedAt ? current : best
        );

        if (candidates.length > 1) {
            const nowIso = new Date().toISOString();
            const updates = candidates
                .filter((entry) => entry.id !== active.id)
                .map((entry) =>
                    musicCollectionRef.doc(entry.id).set(
                        {
                            state: "off",
                            updatedAt: nowIso,
                        },
                        { merge: true }
                    )
                );

            if (updates.length > 0) {
                Promise.all(updates).catch((error) => {
                    console.error("Failed to turn off older melodies:", error);
                });
            }
        }

        const { notes, play, id } = active;
        const notesKey = serializeNotes(notes);
        const isNewSong = lastMusicDocId !== id;
        const notesChanged = isNewSong || notesKey !== lastMusicState.notesKey;
        const hasPlayValue = play !== null;
        const playChanged = isNewSong || (hasPlayValue && play !== lastMusicState.play);

        if (!notesChanged && !playChanged) return;

        console.log("Firestore music update");

        if (notesChanged) {
            writeLine("C");

            for (const note of notes) {
                writeLine(`A:${note.note},${note.duration}`);
            }

            if (notes.length > 0) {
                writeLine("E");
            }
        }

        if (play !== null && (notesChanged || playChanged)) {
            writeLine(play ? "P:1" : "P:0");
        }

        lastMusicState = {
            notesKey,
            play: hasPlayValue ? play : lastMusicState.play,
        };
        lastMusicDocId = id;
    });
}

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

                await deviceDocRef.set(
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

                await deviceDocRef.set(updates, {
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

module.exports = { 
    normalize, 
    normalizeBoolean, 
    toNumber, 
    clampInt, 
    parseNotes, 
    serializeNotes,
    getFirestoreCommandState,
    getMusicState,
    hasChanges
};