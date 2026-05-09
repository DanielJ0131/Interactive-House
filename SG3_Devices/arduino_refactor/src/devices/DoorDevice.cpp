#include "DoorDevice.h"
#include "../config/Config.h"

void DoorDevice::update(int value)
{
    Serial.println("Door closing (Observer)");

    doorOpen = false;   // Close the door when steam is detected
}