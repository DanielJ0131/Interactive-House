#include <Arduino.h>
#include <unity.h>

#include "../../src/core/Observer.h"
#include "../../src/core/Subject.h"
#include "../../src/safety/GasSafety.h"
#include "../../src/config/Config.cpp"
#include "../../src/safety/GasSafety.cpp"

class MockObserver : public Observer {
public:
	int callCount = 0;
	int lastValue = -1;
	void update(int value) override {
		callCount++;
		lastValue = value;
	}
};

void setUp() {}
void tearDown() {}

void test_no_notify_below_threshold() {
	GasSafety gs;
	MockObserver obs;

	gs.attach(&obs);

	// Ensure threshold is known
	TEST_ASSERT_EQUAL_INT(10, gasThreshold);

	gs.check(5);
	TEST_ASSERT_EQUAL_INT(0, obs.callCount);
}

void test_notify_above_threshold() {
	GasSafety gs;
	MockObserver obs1;
	MockObserver obs2;

	gs.attach(&obs1);
	gs.attach(&obs2);

	gs.check(gasThreshold + 1);

	TEST_ASSERT_EQUAL_INT(1, obs1.callCount);
	TEST_ASSERT_EQUAL_INT(gasThreshold + 1, obs1.lastValue);
	TEST_ASSERT_EQUAL_INT(1, obs2.callCount);
	TEST_ASSERT_EQUAL_INT(gasThreshold + 1, obs2.lastValue);
}

void setup() {
	UNITY_BEGIN();
	RUN_TEST(test_no_notify_below_threshold);
	RUN_TEST(test_notify_above_threshold);
	UNITY_END();
}

void loop() {}

#ifndef ARDUINO
int main() {
	UNITY_BEGIN();
	RUN_TEST(test_no_notify_below_threshold);
	RUN_TEST(test_notify_above_threshold);
	return UNITY_END();
}
#endif
