/**
 * @file main.cpp
 * @brief Arduino entry point for the SG3 smart home controller.
 *
 * Initialises all subsystems and runs the main control loop, which:
 *  - Reads incoming serial commands and forwards them to CommandHandler.
 *  - Polls all sensors every iteration via readSensors().
 *  - Runs the Observer-based safety checks (gas, steam) that can
 *    automatically activate devices (fan, buzzer, door, window).
 *  - Applies pending device state changes to hardware via updateDevices().
 *  - Periodically transmits sensor telemetry and device state over Serial
 *    in a format consumed by the SG3 hub application.
 *  - Keeps the 16x2 I2C LCD display up to date with active states.
 *  - Drives non-blocking music playback through MusicEngine::update().
 *
 * Serial telemetry format (sent every 200 ms, or 1000 ms while music plays):
 *   S:<gas>,<light>,<soil>,<steam>,<motion>
 *   STATE:door=<0|1>,window=<0|1>,fanINA=<0|1>,fanINB=<0|1>,
 *         light=<0|1>,buzzer=<0|1>,orange_light=<0-255>
 *
 * Loop timing:
 *   - 20 ms delay when music is playing or serial data is present (responsive).
 *   - 200 ms delay otherwise (power-efficient idle).
 */

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
LCDManager lcd;       ///< I2C LCD display manager (16x2, address 0x27).
String buffer = "";   ///< Accumulates incoming serial characters until a newline.

GasSafety gas;          ///< Subject that fires observer notifications when gas exceeds threshold.
SteamSensor steam;      ///< Subject that fires observer notifications on steam state changes.

Fan fan;                ///< Observer: turns fan on when gas is detected.
BuzzerDevice buzzerDev; ///< Observer: activates buzzer when gas is detected.
DoorDevice doorDev;     ///< Observer: closes door when steam is detected.
WindowDevice windowDev; ///< Observer: closes window when steam is detected.

/**
 * @brief One-time initialisation run by the Arduino framework at power-on.
 *
 * - Opens Serial at 115200 baud.
 * - Configures GPIO pins and attaches servos (via initDevices()).
 * - Initialises the LCD and prints "System Ready".
 * - Wires Observer instances to their Subject counterparts:
 *     - gas  → fan, buzzerDev
 *     - steam → doorDev, windowDev
 */
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

/**
 * @brief Main control loop, called repeatedly by the Arduino framework.
 *
 * Execution order each iteration:
 *  1. music.update()     – advance melody playback (non-blocking).
 *  2. Serial read        – accumulate characters; dispatch on newline.
 *  3. readSensors()      – sample all analogue and digital sensor pins.
 *  4. gas.check()        – notify fan & buzzer observers if gas > threshold.
 *  5. steam.check()      – notify door & window observers on wet/dry transition.
 *  6. updateDevices()    – write current global state to GPIO / servos / PWM.
 *  7. Telemetry TX       – send S: and STATE: lines if interval has elapsed.
 *  8. LCD update         – refresh display if content changed or 200 ms elapsed.
 *  9. delay()            – adaptive sleep (20 ms active / 200 ms idle).
 */
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