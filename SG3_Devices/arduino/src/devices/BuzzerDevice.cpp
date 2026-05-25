/**
 * @file BuzzerDevice.cpp
 * @brief BuzzerDevice Observer implementation.
 */

#include "BuzzerDevice.h"
#include "../config/Config.h"

void BuzzerDevice::update(int value) {
    buzzer = (value > 0);
}

bool BuzzerDevice::isBuzzerActive() const {
    return buzzer;
}