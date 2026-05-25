/**
 * @file Subject.h
 * @brief Abstract Subject base class for the Observer pattern.
 *
 * Subjects own a fixed-capacity list of Observer pointers.  Concrete
 * subclasses (GasSafety, SteamSensor) call notify() when a condition of
 * interest is met, which in turn calls update() on every registered observer.
 */

#pragma once
#include "Observer.h"

/** @brief Maximum number of observers that can be registered with one Subject. */
#define MAX_OBSERVERS 5

/**
 * @class Subject
 * @brief Base class for event sources that broadcast to multiple Observers.
 *
 * Usage:
 *  1. Create a concrete Subject subclass (e.g. GasSafety).
 *  2. Register Observer instances with attach().
 *  3. The subclass calls notify() when an event should be broadcast.
 */
class Subject {
protected:
    Observer* observers[MAX_OBSERVERS]; ///< Registered observer pointers.
    int count = 0;                       ///< Number of currently registered observers.

public:
    /**
     * @brief Register an observer to receive future notifications.
     * @param obs Pointer to the Observer to add.  Silently ignored if the
     *            array is already full (MAX_OBSERVERS reached).
     */
    void attach(Observer* obs) {
        if (count < MAX_OBSERVERS)
            observers[count++] = obs;
    }

    /**
     * @brief Broadcast @p value to all registered observers.
     * @param value The event magnitude forwarded verbatim to each Observer::update().
     */
    void notify(int value) {
        for (int i = 0; i < count; i++) {
            observers[i]->update(value);
        }
    }
};