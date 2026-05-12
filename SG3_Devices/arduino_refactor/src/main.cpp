#include <Arduino.h>

#include "config/Config.h"
#include "core/CommandHandler.h"
#include "devices/Devices.h"
#include "sensors/Sensors.h"

#include "safety/GasSafety.h"
#include "sensors/SteamSensor.h"

#include "devices/Fan.h"
#include "devices/BuzzerDevice.h"
#include "devices/DoorDevice.h"
#include "devices/WindowDevice.h"

#include "display/LCDManager.h"
#include "music/MusicEngine.h"

// OBJECTS
LCDManager lcd;
String buffer = "";

GasSafety gas;
SteamSensor steam;

Fan fan;
BuzzerDevice buzzerDev;
DoorDevice doorDev;
WindowDevice windowDev;

// SETUP
void setup()
{
    Serial.begin(115200);

    initDevices();
    lcd.init();

    // Observer wiring
    gas.attach(&fan);
    gas.attach(&buzzerDev);

    steam.attach(&doorDev);
    steam.attach(&windowDev);
}

// LOOP
void loop()
{
    music.update();

    bool hasSerialData = Serial.available() > 0;
    const unsigned long nowMs = millis();
    static unsigned long lastTelemetryMs = 0;

    // SERIAL
    while (Serial.available())
    {
        char c = Serial.read();

        if (c == '\n')
        {
            handleCommand(buffer);
            buffer = "";
        }
        else
        {
            buffer += c;
        }
    }


    SensorData s = readSensors();

    // OBSERVER
    gas.check(s.gas);
    steam.check(s.steam);

    // DEVICES
    updateDevices();

    const unsigned long telemetryIntervalMs = music.isPlaying() ? 1000 : 200;
    const bool shouldSendTelemetry = (nowMs - lastTelemetryMs) >= telemetryIntervalMs;

    if (shouldSendTelemetry && !hasSerialData && buffer.length() == 0)
    {
        lastTelemetryMs = nowMs;

        // SEND SENSOR DATA
        Serial.print("S:");
        Serial.print(s.gas);
        Serial.print(",");
        Serial.print(s.light);
        Serial.print(",");
        Serial.print(s.soil);
        Serial.print(",");
        Serial.print(s.steam);
        Serial.print(",");
        Serial.println(s.motion);

        // SEND STATE
        Serial.print("STATE:");
        Serial.print("door="); Serial.print(doorOpen);
        Serial.print(",window="); Serial.print(windowOpen);
        Serial.print(",fanINA="); Serial.print(fanINA);
        Serial.print(",fanINB="); Serial.print(fanINB);
        Serial.print(",light="); Serial.print(whiteLightOn);
        Serial.print(",buzzer="); Serial.print(buzzer);
        Serial.print(",orange_light="); Serial.print(orangeLight);
        Serial.println();
    }

    // LCD
    static String lastLine1 = "";
    static String lastLine2 = "";
    static unsigned long lastLcdMs = 0;
    const unsigned long lcdIntervalMs = 200;

    String activeStates = "";

    // If s.gas is higher than your safety limit, add the alert
    if (s.gas > GAS_THRESHOLD) {
        activeStates += "GAS ALERT! ";
    }

    if (doorOpen)           activeStates += "Door:Open ";
    if (windowOpen)         activeStates += "Win:Open ";
    if (fanINA || fanINB)   activeStates += "Fan:ON ";
    if (whiteLightOn)       activeStates += "W.Light:ON ";
    activeStates += "O.Light:" + String(orangeLight) + " ";
    if (buzzer)             activeStates += "BUZZER!! ";

    // If nothing is active, show a default message
    if (activeStates == "") {
        activeStates = "Software Eng. G4 HKR";
    }

    String line1 = activeStates.substring(0, 16);
    String line2 = activeStates.length() > 16 ? activeStates.substring(16, 32) : "";

    if ((nowMs - lastLcdMs) >= lcdIntervalMs || line1 != lastLine1 || line2 != lastLine2) {
        lcd.show(line1, line2);
        lastLine1 = line1;
        lastLine2 = line2;
        lastLcdMs = nowMs;
    }

    const unsigned long loopDelayMs = (music.isPlaying() || hasSerialData || buffer.length() > 0)
        ? 20
        : 200;
    delay(loopDelayMs);
}