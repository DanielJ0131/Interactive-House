#include <unity.h>

#include "../../src/devices/BuzzerDevice.cpp"
#include "../../src/devices/Fan.cpp"
#include "../../src/devices/DoorDevice.cpp"
#include "../../src/devices/WindowDevice.cpp"
#include "../../src/config/Config.cpp"

void setUp() {}
void tearDown() {}


// ---------------- BUZZER ----------------

void test_buzzer_turns_on() {
    BuzzerDevice buzzer;

    buzzer.update(1);

    TEST_ASSERT_TRUE(buzzer.isBuzzerActive());
}

void test_buzzer_turns_off() {
    BuzzerDevice buzzer;

    buzzer.update(0);

    TEST_ASSERT_FALSE(buzzer.isBuzzerActive());
}


// ---------------- FAN ----------------

void test_fan_turns_correct_direction() {

    fanINA = false;
    fanINB = true;

    Fan fan;
    fan.update(1);

    TEST_ASSERT_TRUE(fanINA);
    TEST_ASSERT_FALSE(fanINB);
}


// ---------------- DOOR ----------------

void test_door_closes() {

    doorOpen = true;

    DoorDevice door;
    door.update(1);

    TEST_ASSERT_FALSE(doorOpen);
}


// ---------------- WINDOW ----------------

void test_window_closes() {

    windowOpen = true;

    WindowDevice window;
    window.update(1);

    TEST_ASSERT_FALSE(windowOpen);
}


int main() {

    UNITY_BEGIN();

    RUN_TEST(test_buzzer_turns_on);
    RUN_TEST(test_buzzer_turns_off);

    RUN_TEST(test_fan_turns_correct_direction);

    RUN_TEST(test_door_closes);

    RUN_TEST(test_window_closes);

    return UNITY_END();
}