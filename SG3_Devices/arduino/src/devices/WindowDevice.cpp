/**
 * @file WindowDevice.cpp
 * @brief WindowDevice Observer implementation.
 */

#include "WindowDevice.h"
#include "../config/Config.h"

void WindowDevice::update(int value)
{
    Serial.println("Window closing (Observer)");

    windowOpen = false;   // Close the window when steam is detected
}