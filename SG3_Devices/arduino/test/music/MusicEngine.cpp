#include <unity.h>
#include "MusicEngine.h"

// --------------------
// Fake time system
// --------------------
unsigned long fakeMillis = 0;

unsigned long millis() {
    return fakeMillis;
}

// --------------------
// Track tone calls (optional verification)
int lastTonePin = -1;
int lastToneFreq = -1;
bool noToneCalled = false;

// Mock Arduino audio functions
void tone(int pin, int freq) {
    lastTonePin = pin;
    lastToneFreq = freq;
    noToneCalled = false;
}

void noTone(int pin) {
    lastTonePin = pin;
    lastToneFreq = 0;
    noToneCalled = true;
}

// --------------------
// Test object
// --------------------
MusicEngine engine;

// --------------------
// Helper
// --------------------
void setupEngine() {
    engine.reset();
    engine.addNote(100, 100);  // note 1
    engine.addNote(200, 100);  // note 2
    engine.finish();
}

// --------------------
// Tests
// --------------------

void test_play_starts_music() {
    setupEngine();

    engine.play();

    TEST_ASSERT_TRUE(engine.isPlaying());
    TEST_ASSERT_EQUAL(100, lastToneFreq);
}

void test_update_moves_to_next_note() {
    setupEngine();
    engine.play();

    fakeMillis = 120; // move past first note duration
    engine.update();

    TEST_ASSERT_EQUAL(200, lastToneFreq);
}

void test_stop_stops_music() {
    setupEngine();
    engine.play();

    engine.stop();

    TEST_ASSERT_FALSE(engine.isPlaying());
    TEST_ASSERT_TRUE(noToneCalled);
}

// --------------------
// Runner
// --------------------
void setup() {
    UNITY_BEGIN();

    RUN_TEST(test_play_starts_music);
    RUN_TEST(test_update_moves_to_next_note);
    RUN_TEST(test_stop_stops_music);

    UNITY_END();
}

void loop() {}