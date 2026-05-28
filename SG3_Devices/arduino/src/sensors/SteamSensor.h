/**
 * @file SteamSensor.h
 * @brief Subject that notifies observers on steam/humidity state changes.
 *
 * SteamSensor extends Subject and monitors the steam ADC value passed in from
 * readSensors().  Rather than firing on every loop iteration, it uses edge
 * detection: observers are only notified when the wet/dry state changes
 * (dry→wet or wet→dry), preventing repeated closures of doors/windows while
 * the condition is continuously met.
 *
 * Observers registered: DoorDevice, WindowDevice.
 */

#pragma once
#include "../core/Subject.h"

/**
 * @class SteamSensor
 * @brief Edge-triggered steam detection Subject.
 *
 * The steam threshold is fixed at 100 (steamThreshold in SteamSensor.cpp).
 * A reading above this value is classified as "wet"; at or below is "dry".
 * notify() is called with the current steamValue only when the wet/dry state
 * transitions, ensuring each observer responds to the event exactly once per
 * transition rather than every loop while steam is present.
 */
class SteamSensor : public Subject {
public:
    /**
     * @brief Evaluate the current steam reading and fire observers on state change.
     * @param steamValue Current steam sensor ADC reading [0-1023].
     *                   Values above 100 are treated as "wet".
     */
    void check(int steamValue);
};