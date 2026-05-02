#include "DoorDevice.h"
#include "../config/config.h"

void DoorDevice::update(int value)
{
    Serial.println("Door closing (Observer)");

    doorOpen = false;   // Close the door when steam is detected
}