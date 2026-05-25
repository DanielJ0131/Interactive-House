/**
 * @file Observer.h
 * @brief Abstract Observer interface for the Observer pattern.
 *
 * Any class that needs to react to events published by a Subject should
 * inherit from Observer and implement update().  Concrete observers in this
 * project include Fan, BuzzerDevice, DoorDevice, and WindowDevice.
 */

#pragma once

/**
 * @class Observer
 * @brief Pure abstract base class for event receivers.
 *
 * Subclasses register themselves with a Subject via Subject::attach() and
 * receive notifications through update() whenever the Subject calls
 * Subject::notify().
 */
class Observer {
public:
    /**
     * @brief Called by the Subject when a notable event occurs.
     * @param value The sensor reading or event magnitude that triggered
     *              the notification (e.g. gas ADC value, steam ADC value).
     */
    virtual void update(int value) = 0;
};