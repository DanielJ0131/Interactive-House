#include <Arduino.h>
#include "Devices.h"
#include "../config/config.h"

void initDevices() {
    pinMode(13, OUTPUT);
    pinMode(7, OUTPUT);
    pinMode(6, OUTPUT);
    pinMode(5, OUTPUT);
    pinMode(3, OUTPUT);
    pinMode(12, OUTPUT);

    doorServo.attach(9);
    windowServo.attach(10);
    
}



void updateDevices() {

    digitalWrite(13, whiteLightOn ? HIGH : LOW);

    digitalWrite(7, fanINA ? HIGH : LOW);
    digitalWrite(6, fanINB ? HIGH : LOW);

    digitalWrite(YELLOW_LED_PIN, yellowLED > 0 ? HIGH : LOW);

    digitalWrite(3, buzzer ? HIGH : LOW);

    doorServo.write(doorOpen ? 150 : 0);
    windowServo.write(windowOpen ? 150 : 0);
}



