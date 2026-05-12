#pragma once
#include <Arduino.h>

class MusicEngine {
public:
    void reset();
    void addNote(int note, int duration);
    void finish();
    void play();
    void stop();
    void update();
    bool isPlaying();

public:
    static const int MAX = 100;

    int melody[MAX];
    int duration[MAX];

    int length = 0;
    int index = 0;

    bool playing = false;
    bool noteOn = false;

private:
    void startNote(unsigned long startMs);

    unsigned long noteStartMs = 0;
    unsigned long noteEndMs = 0;
    unsigned long noteOffMs = 0;
};