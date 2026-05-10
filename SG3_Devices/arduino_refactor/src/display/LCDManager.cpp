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