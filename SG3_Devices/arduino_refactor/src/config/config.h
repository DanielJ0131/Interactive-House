#pragma once
#include <Arduino.h>
#include <Servo.h>
#include "../music/MusicEngine.h"

const int GAS_THRESHOLD = 10;

// pins
#define ORANGE_LIGHT_PIN 5
extern MusicEngine music;

// devices
extern bool doorOpen;
extern bool windowOpen;
extern bool fanINA;
extern bool fanINB;
extern bool whiteLightOn;
extern bool buzzer;

extern int orangeLight;

// gas
extern const int gasThreshold;

// servos
extern Servo doorServo;
extern Servo windowServo;