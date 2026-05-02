#pragma once
#include <Arduino.h>

#define GAS_PIN A0
#define LIGHT_PIN A1
#define YELLOW_LED_PIN 5
#define SOIL_PIN A2
#define STEAM_PIN A3
#define MOTION_PIN 2

struct SensorData {
    int gas;
    int light;
    int soil;
    int steam;
    int motion;
};

SensorData readSensors();