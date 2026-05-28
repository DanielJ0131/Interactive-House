/**
 * @file CommandHandler.h
 * @brief Serial command parser interface.
 *
 * Declares handleCommand(), which is called from main.cpp whenever a complete
 * newline-terminated command string has been received over Serial.
 */

#pragma once
#include <Arduino.h>

/**
 * @brief Parse and execute a single serial command string.
 *
 * Leading/trailing whitespace is trimmed before matching.  Unrecognised
 * commands are silently ignored.
 *
 * Supported commands:
 * | Command      | Effect                                      |
 * |--------------|---------------------------------------------|
 * | D:1 / D:0    | Open / close door                           |
 * | N:1 / N:0    | Open / close window                         |
 * | X:1 / X:0    | Fan motor INA on / off                      |
 * | Y:1 / Y:0    | Fan motor INB on / off                      |
 * | W:1 / W:0    | White light on / off                        |
 * | YL:\<0-255\> | Set orange light PWM intensity              |
 * | B:1 / B:0    | Buzzer on / off                             |
 * | C            | Reset music engine (clear melody, stop)     |
 * | A:\<hz\>,\<ms\> | Append a note (frequency Hz, duration ms) to the melody |
 * | E            | Mark end of melody (reset playback index)   |
 * | P:1 / P:0    | Start / stop music playback                 |
 *
 * @param c The raw command string received from Serial (newline already stripped).
 */
void handleCommand(String c);