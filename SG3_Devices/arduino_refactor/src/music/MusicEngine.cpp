#include "MusicEngine.h"

#define BUZZER_PIN 3

void MusicEngine::reset() {
    length = 0;
    index = 0;
    playing = false;
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
    if (length == 0) return;

    playing = true;
    index = 0;
    lastTime = millis();

    tone(BUZZER_PIN, melody[0]);
    noteOn = true;
}

void MusicEngine::stop() {
    playing = false;
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
            index = 0; // loop song
        }

        tone(BUZZER_PIN, melody[index]);
        lastTime = now;
        noteOn = true;
    }
}

// ✅ CORRECT PLACE
bool MusicEngine::isPlaying() {
    return playing;
}