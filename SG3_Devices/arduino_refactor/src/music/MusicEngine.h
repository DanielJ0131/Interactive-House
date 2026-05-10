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

public:
    static const int MAX = 100;

    int melody[MAX];
    int duration[MAX];

    int length = 0;
    int index = 0;

    bool playing = false;
    bool noteOn = false;
    bool isPlaying();

    unsigned long lastTime = 0;
};