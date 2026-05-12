#include <unity.h>
#include "Sensors.h"

// --------------------
// Mock values
// --------------------
int mockGas = 100;
int mockLight = 200;
int mockSoil = 300;
int mockSteam = 400;
int mockMotion = 1;

// --------------------
// Mock Arduino functions
// --------------------
int analogRead(int pin) {
    if (pin == GAS_PIN) return mockGas;
    if (pin == LIGHT_PIN) return mockLight;
    if (pin == SOIL_PIN) return mockSoil;
    if (pin == STEAM_PIN) return mockSteam;
    return 0;
}

int digitalRead(int pin) {
    if (pin == MOTION_PIN) return mockMotion;
    return 0;
}

// --------------------
// Test
// --------------------
void test_readSensors() {
    SensorData s = readSensors();

    TEST_ASSERT_EQUAL(100, s.gas);
    TEST_ASSERT_EQUAL(200, s.light);
    TEST_ASSERT_EQUAL(300, s.soil);
    TEST_ASSERT_EQUAL(400, s.steam);
    TEST_ASSERT_EQUAL(1, s.motion);
}

// --------------------
// Runner
// --------------------
void setup() {
    UNITY_BEGIN();
    RUN_TEST(test_readSensors);
    UNITY_END();
}

void loop() {}