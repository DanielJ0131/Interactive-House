#include <Arduino.h>
#include <unity.h>

#include "../../src/config/Config.h"
#include "../../src/config/Config.cpp"

void setUp() {}
void tearDown() {}

void test_defaults() {
	TEST_ASSERT_FALSE(doorOpen);
	TEST_ASSERT_FALSE(windowOpen);
	TEST_ASSERT_FALSE(fanINA);
	TEST_ASSERT_FALSE(fanINB);
	TEST_ASSERT_FALSE(whiteLightOn);
	TEST_ASSERT_FALSE(buzzer);
	TEST_ASSERT_EQUAL_INT(0, orangeLight);
	TEST_ASSERT_EQUAL_INT(10, gasThreshold);
}

void test_modify_globals() {
	doorOpen = true;
	orangeLight = 123;

	TEST_ASSERT_TRUE(doorOpen);
	TEST_ASSERT_EQUAL_INT(123, orangeLight);

	// toggle back
	doorOpen = false;
	TEST_ASSERT_FALSE(doorOpen);
}

void setup() {
	UNITY_BEGIN();
	RUN_TEST(test_defaults);
	RUN_TEST(test_modify_globals);
	UNITY_END();
}

void loop() {}

#ifndef ARDUINO
int main() {
	UNITY_BEGIN();
	RUN_TEST(test_defaults);
	RUN_TEST(test_modify_globals);
	return UNITY_END();
}
#endif
