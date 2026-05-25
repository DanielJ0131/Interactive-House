#pragma once

#include "Arduino.h"

class LiquidCrystal_I2C {
public:
    LiquidCrystal_I2C(uint8_t, uint8_t, uint8_t) {}
    void init() {}
    void backlight() {}
    void setCursor(uint8_t, uint8_t) {}
    void print(const String &) {}
    void print(const char *) {}
};
