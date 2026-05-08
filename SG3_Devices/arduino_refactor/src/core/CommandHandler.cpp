#include "CommandHandler.h"
#include "../config/config.h"
#include "../music/MusicEngine.h"

extern MusicEngine music;

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

    int note = c.substring(2, comma).toInt();
    int dur = c.substring(comma + 1).toInt();

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