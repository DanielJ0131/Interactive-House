#include <Arduino.h>

#include "config/config.h"
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
MusicEngine music;

GasSafety gas;
SteamSensor steam;

Fan fan;
BuzzerDevice buzzerDev;
DoorDevice doorDev;
WindowDevice windowDev;

// SETUP
void setup() {
    Serial.begin(9600);

    initDevices();
    lcd.init();

    // Observer wiring
    gas.attach(&fan);
    gas.attach(&buzzerDev);

    steam.attach(&doorDev);
    steam.attach(&windowDev);
}

// LOOP
void loop() {
    music.update();

    // SERIAL COMMANDS
    while (Serial.available()) {
        char c = Serial.read();

        if (c == '\n') {
            handleCommand(buffer);
            buffer = "";
        } else {
            buffer += c;
        }
    }

    // READ SENSORS
    SensorData s = readSensors();

    // SEND SENSOR DATA
    Serial.print("S:");
    Serial.print(s.gas); Serial.print(",");
    Serial.print(s.light); Serial.print(",");
    Serial.print(s.soil); Serial.print(",");
    Serial.print(s.steam); Serial.print(",");
    Serial.println(s.motion);

    // OBSERVER LOGIC
    gas.check(s.gas);
    steam.check(s.steam);

    // APPLY DEVICE STATES
    updateDevices();

    // SEND DEVICE STATE TO GATEWAY
    Serial.print("STATE:");
    Serial.print("door="); Serial.print(doorOpen ? 1 : 0);
    Serial.print(",window="); Serial.print(windowOpen ? 1 : 0);
    Serial.print(",fanINA="); Serial.print(fanINA ? 1 : 0);
    Serial.print(",fanINB="); Serial.print(fanINB ? 1 : 0);
    Serial.print(",light="); Serial.print(whiteLightOn ? 1 : 0);
    Serial.print(",buzzer="); Serial.print(buzzer ? 1 : 0);
    Serial.print(",yellowLED="); Serial.print(yellowLED);
    Serial.println();

    // LCD
    lcd.show(
        "G:" + String(s.gas) + " YL:" + String(s.light),
        "S:" + String(s.steam) + " M:" + String(s.motion)
    );

    delay(200);
}