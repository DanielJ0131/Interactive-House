/**
 * @file DoorDevice.h
 * @brief Observer that closes the door automatically on steam detection.
 *
 * DoorDevice is registered as an observer of SteamSensor.  When the steam
 * sensor crosses the wet/dry threshold, SteamSensor::notify() calls update()
 * here, which sets doorOpen = false.  The door servo is driven to 0° on the
 * next updateDevices() call in the main loop.
 */

#pragma once
#include "../core/Observer.h"

/**
 * @class DoorDevice
 * @brief Closes the door when a steam event is received.
 *
 * SteamSensor only fires on state transitions (dry→wet or wet→dry), so this
 * observer is called at most once per transition, not continuously.  Closing
 * on the wet→dry transition means the door also closes when steam clears,
 * which acts as a safety reset after the steam event.
 */
class DoorDevice : public Observer {
public:
    /**
     * @brief Observer callback: closes the door by setting doorOpen = false.
     * @param value Steam sensor reading passed through from SteamSensor::notify().
     *              The value itself is not used; any notification closes the door.
     */
    void update(int value) override;
};