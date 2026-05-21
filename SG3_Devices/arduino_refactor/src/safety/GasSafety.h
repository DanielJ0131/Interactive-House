/**
 * @file GasSafety.h
 * @brief Subject that continuously notifies observers while gas exceeds the threshold.
 *
 * GasSafety extends Subject and monitors the gas ADC value passed in from
 * readSensors().  Unlike SteamSensor, it uses level detection rather than edge
 * detection: observers are notified on every loop iteration for as long as the
 * gas reading stays above gasThreshold (10).  This ensures the fan keeps
 * running and the buzzer keeps sounding continuously while gas is present.
 *
 * Observers registered: Fan, BuzzerDevice.
 */

#pragma once
#include "../core/Subject.h"

/**
 * @class GasSafety
 * @brief Level-triggered gas detection Subject.
 *
 * Calls notify() with the raw gas ADC value every loop iteration that
 * gasValue > gasThreshold.  There is no "gas cleared" notification; observers
 * are simply not called once the reading drops back below the threshold.
 */
class GasSafety : public Subject {
public:
    /**
     * @brief Evaluate the current gas reading and fire observers if threshold exceeded.
     * @param gasValue Current gas sensor ADC reading [0-1023].
     *                 Observers are notified whenever gasValue > gasThreshold (10).
     */
    void check(int gasValue);
};