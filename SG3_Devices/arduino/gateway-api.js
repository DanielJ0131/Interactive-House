const express = require("express");
const cors = require("cors");
const { SerialPort } = require("serialport");

require("dotenv").config({ path: "config/.env" });

const app = express();
app.use(cors());
app.use(express.json());

app.post("/command", (req, res) => {
    const { command } = req.body;
  
    console.log("Received command:", command);
  
    sendCommand(command);
  
    res.json({
      success: true,
      command,
    });
  });

const PORT = process.env.API_PORT || 5050;
const MOCK_SERIAL = process.env.MOCK_SERIAL !== "false";

const serialPort = !MOCK_SERIAL
  ? new SerialPort({
      path: process.env.SERIAL_PORT,
      baudRate: Number(process.env.SERIAL_BAUD || 9600),
    })
  : null;

  function sendCommand(command) {
    if (MOCK_SERIAL) {
      console.log("[MOCK] Would send:", command);
      return;
    }
  
    console.log("[SERIAL] Sending:", command);
  
    serialPort.write(command + "\n");
  }

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    mode: MOCK_SERIAL ? "mock" : "real",
  });
});

app.post("/door/open", (req, res) => {
  sendCommand("D:1");
  res.json({ ok: true, command: "D:1" });
});

app.post("/door/close", (req, res) => {
  sendCommand("D:0");
  res.json({ ok: true, command: "D:0" });
});

app.post("/window/open", (req, res) => {
  sendCommand("N:1");
  res.json({ ok: true, command: "N:1" });
});

app.post("/window/close", (req, res) => {
  sendCommand("N:0");
  res.json({ ok: true, command: "N:0" });
});

app.post("/buzzer/on", (req, res) => {
  sendCommand("B:1");
  res.json({ ok: true, command: "B:1" });
});

app.post("/buzzer/off", (req, res) => {
  sendCommand("B:0");
  res.json({ ok: true, command: "B:0" });
});

app.post("/fan-ina/on", (req, res) => {
  sendCommand("X:1");
  res.json({ ok: true, command: "X:1" });
});

app.post("/fan-ina/off", (req, res) => {
  sendCommand("X:0");
  res.json({ ok: true, command: "X:0" });
});

app.post("/fan-inb/on", (req, res) => {
  sendCommand("Y:1");
  res.json({ ok: true, command: "Y:1" });
});

app.post("/fan-inb/off", (req, res) => {
  sendCommand("Y:0");
  res.json({ ok: true, command: "Y:0" });
});

app.post("/white-light/on", (req, res) => {
  sendCommand("W:1");
  res.json({ ok: true, command: "W:1" });
});

app.post("/white-light/off", (req, res) => {
  sendCommand("W:0");
  res.json({ ok: true, command: "W:0" });
});

app.post("/orange-light", (req, res) => {
  const value = Number(req.body?.value);

  if (!Number.isFinite(value) || value < 0 || value > 255) {
    return res.status(400).json({
      ok: false,
      error: "value must be a number between 0 and 255",
    });
  }

  const command = `YL:${value}`;
  sendCommand(command);
  res.json({ ok: true, command });
});

const server = app.listen(PORT, () => {
  console.log(`Gateway API running on http://localhost:${PORT}`);
  console.log(`Mode: ${MOCK_SERIAL ? "mock" : "real"}`);
});

// Graceful shutdown for Ctrl+C / termination.
function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down...`);

  if (!server) {
    process.exit(0);
    return;
  }

  server.close(() => {
    if (serialPort && serialPort.isOpen) {
      serialPort.close(() => {
        process.exit(0);
      });
      return;
    }

    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));