#include "WindowDevice.h"
#include "../config/config.h"

void WindowDevice::update(int value) {
    Serial.println("Closing window");
    windowOpen = false;
}