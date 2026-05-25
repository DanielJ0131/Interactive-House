/**
 * @file LCDManager.cpp
 * @brief LCDManager implementation.
 *
 * Each call to show() writes 16 spaces to clear a line before printing the
 * new string.  This technique avoids calling lcd.clear() (which causes a
 * visible flicker) while still preventing stale characters from persisting
 * when shorter strings follow longer ones.
 */

#include "LCDManager.h"

LCDManager::LCDManager() : lcd(0x27, 16, 2) {}

void LCDManager::init() {
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("System Ready");
}

void LCDManager::show(String l1, String l2) {
    lcd.setCursor(0, 0);
    lcd.print("                ");
    lcd.setCursor(0, 0);
    lcd.print(l1);

    lcd.setCursor(0, 1);
    lcd.print("                ");
    lcd.setCursor(0, 1);
    lcd.print(l2);
}