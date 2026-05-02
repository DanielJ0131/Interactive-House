#include "SteamSensor.h"

const int steamThreshold = 100;
bool wasWet = false;

void SteamSensor::check(int steamValue) {

    bool isWet = steamValue > steamThreshold;

    // Trigger ONLY when state changes
    if (isWet && !wasWet) {
        notify(steamValue);
    }

    wasWet = isWet;
}