#include "Sensors.h"

SensorData readSensors() {
    SensorData s;

    s.gas = analogRead(GAS_PIN);
    s.light = analogRead(LIGHT_PIN);
    s.soil = analogRead(SOIL_PIN);
    s.steam = analogRead(STEAM_PIN);
    s.motion = digitalRead(MOTION_PIN);

    return s;
}