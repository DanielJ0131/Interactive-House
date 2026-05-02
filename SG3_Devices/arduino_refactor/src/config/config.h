#pragma once
#include <Arduino.h>
#include <Servo.h>

// pins
#define YELLOW_LED_PIN 5

// devices
extern bool doorOpen;
extern bool windowOpen;
extern bool fanINA;
extern bool fanINB;
extern bool whiteLightOn;
extern bool buzzer;

extern int yellowLED;

// gas
extern const int gasThreshold;

// servos
extern Servo doorServo;
extern Servo windowServo;