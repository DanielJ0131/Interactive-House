/**
 * @file MusicEngine.cpp
 * @brief Non-blocking melody playback implementation.
 *
 * Timing strategy: startNote() records noteEndMs as (previous noteEndMs +
 * duration) rather than (millis() + duration).  This means any small overrun
 * in loop() execution time does not accumulate as timing drift across the
 * melody — each note's logical start is anchored to the previous note's
 * logical end.
 */

#include "MusicEngine.h"

#define BUZZER_PIN 3 ///< Arduino pin used for tone generation (shared with buzzer).

void MusicEngine::reset() {
    length = 0;
    index = 0;
    playing = false;
    noteOn = false;
    noteStartMs = 0;
    noteEndMs = 0;
    noteOffMs = 0;
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
    startNote(millis());
}

void MusicEngine::stop() {
    playing = false;
    noteOn = false;
    noTone(BUZZER_PIN);
}

void MusicEngine::startNote(unsigned long startMs) {
    int note = melody[index];
    unsigned long durMs = (unsigned long)duration[index];

    if (durMs == 0) {
        durMs = 1;
    }

    noteStartMs = startMs;
    noteEndMs = startMs + durMs;
    noteOffMs = startMs + (durMs * 9UL) / 10UL;

    if (note > 0) {
        tone(BUZZER_PIN, note);
        noteOn = true;
    } else {
        noTone(BUZZER_PIN);
        noteOn = false;
    }
}

void MusicEngine::update() {
    if (!playing || length == 0) return;

    unsigned long now = millis();

    while (playing && now >= noteEndMs) {
        index++;

        if (index >= length) {
            stop();
            return;
        }

        startNote(noteEndMs);
    }

    if (noteOn && now >= noteOffMs) {
        noTone(BUZZER_PIN);
        noteOn = false;
    }
}


bool MusicEngine::isPlaying() {
    return playing;
}