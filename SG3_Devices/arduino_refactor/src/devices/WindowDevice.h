/**
 * @file WindowDevice.h
 * @brief Observer that closes the window automatically on steam detection.
 *
 * WindowDevice is registered as an observer of SteamSensor.  When the steam
 * sensor crosses the wet/dry threshold, SteamSensor::notify() calls update()
 * here, which sets windowOpen = false.  The window servo is driven to 0° on
 * the next updateDevices() call in the main loop.
 *
 * Works in tandem with DoorDevice to contain steam/humidity within the
 * monitored area when a steam event is detected.
 */

#pragma once
#include "../core/Observer.h"

/**
 * @class WindowDevice
 * @brief Closes the window when a steam event is received.
 *
 * Mirrors DoorDevice behaviour for the window servo.  Like DoorDevice, this
 * observer fires on every steam state transition (wet↔dry), not continuously.
 */
class WindowDevice : public Observer {
public:
    /**
     * @brief Observer callback: closes the window by setting windowOpen = false.
     * @param value Steam sensor reading passed through from SteamSensor::notify().
     *              The value itself is not used; any notification closes the window.
     */
    void update(int value) override;
};