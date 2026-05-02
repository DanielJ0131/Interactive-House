#pragma once
#include <Arduino.h>
#include <LiquidCrystal_I2C.h>

class LCDManager {
public:
    LCDManager();
    void init();
    void show(String l1, String l2);

private:
    LiquidCrystal_I2C lcd;
};