/**
 * @file CommandHandler.cpp
 * @brief Implementation of the serial command parser.
 *
 * Parses newline-terminated ASCII command strings received from the SG3 hub
 * and updates shared global state (Config.h) or the MusicEngine accordingly.
 * Invalid or malformed commands are silently discarded to avoid blocking the
 * main loop.
 */

#include "CommandHandler.h"
#include "../config/Config.h"
#include "../music/MusicEngine.h"

extern MusicEngine music;

/**
 * @brief Parse and execute a single serial command.
 *
 * See CommandHandler.h for the full command reference table.
 *
 * Music note loading sequence expected from the hub:
 *  1. Send "C" to reset the engine and clear any existing melody.
 *  2. Send one or more "A:<hz>,<ms>" commands to populate the note queue.
 *  3. Send "E" to mark the end of the melody (resets index to 0).
 *  4. Send "P:1" to start playback.
 *
 * @param c Trimmed command string (no newline).
 */
void handleCommand(String c) {

    c.trim();

    // DOOR
    if (c == "D:1") {
        doorOpen = true;
    } else if (c == "D:0") {
        doorOpen = false;
    }

    // WINDOW
    else if (c == "N:1") {
        windowOpen = true;
    } else if (c == "N:0") {
        windowOpen = false;
    }

    // FAN INA
    else if (c == "X:1") {
        fanINA = true;
    } else if (c == "X:0") {
        fanINA = false;
    }

    // FAN INB
    else if (c == "Y:1") {
        fanINB = true;
    } else if (c == "Y:0") {
        fanINB = false;
    }

    // WHITE LIGHT
    else if (c == "W:1") {
        whiteLightOn = true;
    } else if (c == "W:0") {
        whiteLightOn = false;
    }

    // ORANGE LIGHT (0-255)
    else if (c.startsWith("YL:")) {
        int value = c.substring(3).toInt();
        orangeLight = constrain(value, 0, 255);
    }

    else if (c == "C") {
        music.reset();
    }

    else if (c.startsWith("A:")) {
        int comma = c.indexOf(',');
        if (comma <= 2) {
            return;
        }

        int note = c.substring(2, comma).toInt();
        int dur = c.substring(comma + 1).toInt();
        if (dur <= 0) {
            return;
        }

        music.addNote(note, dur);
    }

    else if (c == "E") {
        music.finish();
    }

    else if (c == "P:1") {
        music.play();
    }

    else if (c == "P:0") {
        music.stop();
    }

    // BUZZER
    else if (c == "B:1") {
        buzzer = true;
    } else if (c == "B:0") {
        buzzer = false;
    }
}