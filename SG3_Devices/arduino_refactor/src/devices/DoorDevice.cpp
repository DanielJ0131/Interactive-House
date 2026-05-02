#include "DoorDevice.h"
#include "../config/config.h"

void DoorDevice::update(int value) {
    Serial.println("Closing door");
    doorOpen = false;
}