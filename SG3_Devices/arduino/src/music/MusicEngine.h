/**
 * @file MusicEngine.h
 * @brief Non-blocking melody playback engine for the buzzer.
 *
 * MusicEngine stores a sequence of (frequency, duration) note pairs and plays
 * them through the buzzer on pin 3 using the Arduino tone() / noTone() API.
 * Playback is driven by update(), which must be called every loop iteration;
 * it advances through notes based on millis() timestamps without using delay().
 *
 * Note envelope:
 *   Each note plays for 90 % of its stated duration, then tone is silenced for
 *   the remaining 10 %.  This creates a small gap between consecutive notes,
 *   making melodies sound more natural.
 *
 * Melody loading sequence (via CommandHandler):
 *  1. "C"            – reset() clears any existing melody.
 *  2. "A:<hz>,<ms>"  – addNote() appends each note (up to MAX = 100).
 *  3. "E"            – finish() resets the playback index to 0.
 *  4. "P:1"          – play() starts playback from the first note.
 *
 * While music is playing, updateDevices() (Devices.cpp) suppresses the
 * standalone buzzer tone so both do not conflict on pin 3.
 */

#pragma once
#include <Arduino.h>

/**
 * @class MusicEngine
 * @brief Stores and plays a melody non-blocking on the buzzer pin.
 */
class MusicEngine {
public:
    /**
     * @brief Clear the melody, stop playback, and silence the buzzer.
     *
     * Resets all state: length, index, playing, noteOn, and all timing
     * variables.  Should be called before loading a new melody.
     */
    void reset();

    /**
     * @brief Append a single note to the melody queue.
     * @param note     Frequency in Hz.  Pass 0 for a rest (silence).
     * @param duration Note duration in milliseconds.
     *                 Ignored if the melody array is already full (MAX notes).
     */
    void addNote(int note, int duration);

    /**
     * @brief Reset the playback index to 0 after the melody has been loaded.
     *
     * Called after all addNote() commands have been sent ("E" command) to
     * ensure play() starts from the beginning of the melody.
     */
    void finish();

    /**
     * @brief Start playback from the first note.
     *
     * Calls stop() immediately and returns if the melody is empty.
     * Sets playing = true and fires the first note via startNote().
     */
    void play();

    /**
     * @brief Stop playback and silence the buzzer.
     */
    void stop();

    /**
     * @brief Advance melody playback; must be called every loop iteration.
     *
     * Compares millis() against per-note end timestamps and advances the
     * index when a note's full duration has elapsed.  Silences the tone at
     * 90 % of the note duration to add a brief inter-note gap.
     * Calls stop() automatically when the last note finishes.
     */
    void update();

    /**
     * @brief Check whether the engine is currently playing a melody.
     * @return true if playback is active.
     */
    bool isPlaying();

public:
    static const int MAX = 100; ///< Maximum number of notes per melody.

    int melody[MAX];    ///< Note frequencies in Hz (0 = rest).
    int duration[MAX];  ///< Note durations in milliseconds (parallel to melody[]).

    int length = 0;     ///< Number of notes currently loaded.
    int index = 0;      ///< Index of the note currently being played.

    bool playing = false; ///< true while playback is active.
    bool noteOn = false;  ///< true while tone() is actively being driven for the current note.

private:
    /**
     * @brief Begin playing the note at the current index.
     * @param startMs The millis() timestamp when this note logically starts
     *                (usually the end time of the previous note, not millis()
     *                 itself, to prevent timing drift across notes).
     */
    void startNote(unsigned long startMs);

    unsigned long noteStartMs = 0; ///< millis() when the current note started.
    unsigned long noteEndMs   = 0; ///< millis() when the current note's full duration ends.
    unsigned long noteOffMs   = 0; ///< millis() when the tone should be silenced (90% point).
};