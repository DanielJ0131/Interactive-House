#include "MusicEngine.h"

#define BUZZER_PIN 3

void MusicEngine::reset() {
    length = 0;
    index = 0;
    playing = false;
    noteOn = false;
    noTone(BUZZER_PIN);
}

void MusicEngine::addNote(int note, int dur) {
    if (length >= MAX) return;

    melody[length] = note;
    duration[length] = dur;
    length++;
}

void MusicEngine::finish() {
    index = 0;
}

void MusicEngine::play() {
    if (length == 0) {
        stop();
        return;
    }

    playing = true;
    index = 0;
    lastTime = millis();

    if (melody[0] > 0) {
        tone(BUZZER_PIN, melody[0]);
        noteOn = true;
    } else {
        noTone(BUZZER_PIN);
        noteOn = false;
    }
}

void MusicEngine::stop() {
    playing = false;
    noteOn = false;
    noTone(BUZZER_PIN);
}

void MusicEngine::update() {
    if (!playing || length == 0) return;

    unsigned long now = millis();
    unsigned long noteDuration = (unsigned long)duration[index];

    // stop sound before note ends (gap)
    if (noteOn && now - lastTime > (noteDuration * 0.9)) {
        noTone(BUZZER_PIN);
        noteOn = false;
    }

    // move to next note
    if (now - lastTime >= noteDuration) {
        index++;

        if (index >= length) {
            stop();
            return;
        }

        if (melody[index] > 0) {
            tone(BUZZER_PIN, melody[index]);
            noteOn = true;
        } else {
            noTone(BUZZER_PIN);
            noteOn = false;
        }
        lastTime = now;
    }
}


bool MusicEngine::isPlaying() {
    return playing;
}