/**
 * @file Config.cpp
 * @brief Definitions and initial values for all shared global state.
 *
 * Instantiates the objects and variables declared as externs in Config.h.
 * All device states default to off/closed/0 at startup; they are updated
 * by CommandHandler (via serial commands) and by Observer implementations
 * (via automated safety responses).
 */

#include "Config.h"

Servo doorServo;       ///< Servo object for the door; attached to pin 9 in initDevices().
Servo windowServo;     ///< Servo object for the window; attached to pin 10 in initDevices().
MusicEngine music;     ///< Global MusicEngine instance shared across all modules.

bool doorOpen = false;      ///< Door state: false = closed (servo at 0°).
bool windowOpen = false;    ///< Window state: false = closed (servo at 0°).
bool fanINA = false;        ///< Fan motor driver INA: false = LOW.
bool fanINB = false;        ///< Fan motor driver INB: false = LOW.
bool whiteLightOn = false;  ///< White light: false = off.
bool buzzer = false;        ///< Buzzer: false = silent.

int orangeLight = 0;        ///< Orange light PWM level: 0 = fully off.

const int gasThreshold = 10; ///< Gas alarm threshold matching GAS_THRESHOLD in Config.h.