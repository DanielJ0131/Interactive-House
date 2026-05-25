/**
 * @file Config.h
 * @brief Central configuration and shared global state declarations.
 *
 * All device state variables and hardware constants used across the firmware
 * are declared here as externs and defined in Config.cpp.  Every module that
 * needs to read or write device state should include this header rather than
 * maintaining its own local copies.
 *
 * Pin assignments:
 *   - ORANGE_LIGHT_PIN (5): PWM output for orange/warm light dimming.
 *
 * Safety constants:
 *   - GAS_THRESHOLD (10): Analogue gas reading above which safety observers
 *     (fan, buzzer) are triggered.  Mirror of gasThreshold defined at runtime.
 */

#pragma once
#include <Arduino.h>
#include <Servo.h>
#include "../music/MusicEngine.h"

const int GAS_THRESHOLD = 10; ///< Compile-time gas alarm threshold (analogue 0-1023).

// pins
#define ORANGE_LIGHT_PIN 5    ///< PWM pin for orange light intensity control (0-255).

extern MusicEngine music;     ///< Global melody engine; updated every loop iteration.

// devices
extern bool doorOpen;         ///< true = door servo rotated to open position (150°).
extern bool windowOpen;       ///< true = window servo rotated to open position (150°).
extern bool fanINA;           ///< true = fan motor driver input A asserted HIGH.
extern bool fanINB;           ///< true = fan motor driver input B asserted HIGH.
extern bool whiteLightOn;     ///< true = white light (pin 13) driven HIGH.
extern bool buzzer;           ///< true = buzzer emitting 1 kHz tone (when music is not playing).

extern int orangeLight;       ///< PWM duty cycle for orange light, clamped to [0, 255].

// gas
extern const int gasThreshold; ///< Runtime gas alarm threshold; equals GAS_THRESHOLD (10).

// servos
extern Servo doorServo;       ///< Servo controlling the door (attached to pin 9).
extern Servo windowServo;     ///< Servo controlling the window (attached to pin 10).