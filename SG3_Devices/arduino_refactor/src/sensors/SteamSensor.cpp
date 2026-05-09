#include "SteamSensor.h"

const int steamThreshold = 100;
bool wasWet = false;

void SteamSensor::check(int steamValue) {

    bool isWet = steamValue > steamThreshold;

    if (isWet != wasWet) {
        notify(steamValue); // trigger observers
    }

    wasWet = isWet;
}