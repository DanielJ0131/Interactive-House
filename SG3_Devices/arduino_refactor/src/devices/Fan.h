/**
 * @file Fan.h
 * @brief Observer that activates the ventilation fan in response to gas detection.
 *
 * Fan is registered as an observer of GasSafety.  When gas exceeds the safety
 * threshold, GasSafety::notify() calls update() here, which sets fanINA = true
 * and fanINB = false, starting the motor in a single forward direction.
 * updateDevices() (Devices.cpp) applies these flags to the GPIO pins each loop.
 */

#pragma once
#include "../core/Observer.h"

/**
 * @class Fan
 * @brief Turns the fan motor on (forward direction) when a gas event is received.
 *
 * The fan motor driver uses two inputs (INA, INB).  Setting INA HIGH and INB
 * LOW rotates the motor in one direction only.  There is no automatic shut-off
 * once gas clears; the fan can only be stopped via the X:0 / Y:0 serial
 * commands.
 */
class Fan : public Observer {
public:
    /**
     * @brief Observer callback: engages the fan motor forward direction.
     * @param value Gas sensor reading (unused; fan always runs in the same
     *              direction regardless of the reading's magnitude).
     */
    void update(int value) override;
};