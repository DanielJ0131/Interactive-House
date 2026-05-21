/**
 * @file SteamSensor.cpp
 * @brief SteamSensor Subject implementation.
 *
 * Uses a static wasWet flag to track the previous wet/dry state so that
 * notify() is only called on transitions, not on every loop iteration.
 */

#include "SteamSensor.h"

/** @brief ADC threshold above which the environment is considered "wet". */
const int steamThreshold = 100;

/** @brief Tracks the wet/dry state from the previous check() call. */
bool wasWet = false;

void SteamSensor::check(int steamValue) {

    bool isWet = steamValue > steamThreshold;

    if (isWet != wasWet) {
        notify(steamValue); // trigger observers
    }

    wasWet = isWet;
}