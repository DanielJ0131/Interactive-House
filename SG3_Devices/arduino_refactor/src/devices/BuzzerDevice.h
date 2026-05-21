/**
 * @file BuzzerDevice.h
 * @brief Observer that activates the buzzer in response to gas detection.
 *
 * BuzzerDevice is registered as an observer of GasSafety.  When gas exceeds
 * the safety threshold, GasSafety calls notify(), which triggers update() here
 * and sets the global buzzer flag to true.  The actual tone is generated in
 * updateDevices() (Devices.cpp), which checks the flag every loop iteration.
 */

#pragma once
#include "../core/Observer.h"

/**
 * @class BuzzerDevice
 * @brief Turns the buzzer on when a gas event is received.
 *
 * The buzzer will remain on until a "B:0" serial command explicitly clears it,
 * because GasSafety::check() only sends a notification while gas is present —
 * it never sends a "gas cleared" notification.
 */
class BuzzerDevice : public Observer {
public:
    /**
     * @brief Observer callback: sets global buzzer state.
     * @param value Gas sensor reading passed through from GasSafety::notify().
     *              buzzer is set to true when value > 0, false otherwise.
     */
    void update(int value) override;

    /**
     * @brief Returns the current state of the global buzzer flag.
     * @return true if the buzzer is currently active.
     */
    bool isBuzzerActive() const;
};