#include "WindowDevice.h"
#include "../config/config.h"

void WindowDevice::update(int value)
{
    Serial.println("Window closing (Observer)");

    windowOpen = false;   // Close the window when steam is detected
}