#include <Arduino.h>
#include <unity.h>
#include <Servo.h>

#include "../../src/core/Observer.h"
#include "../../src/core/Subject.h"
#include "../../src/music/MusicEngine.h"

// Define extern globals from Config.h used by CommandHandler.cpp
MusicEngine music;
bool doorOpen = false;
bool windowOpen = false;
bool fanINA = false;
bool fanINB = false;
bool whiteLightOn = false;
bool buzzer = false;
int orangeLight = 0;
const int gasThreshold = 10;
Servo doorServo;
Servo windowServo;

// Provide lightweight MusicEngine behavior for command tests.
void MusicEngine::reset() {
	length = 0;
	index = 0;
	playing = false;
	noteOn = false;
}

void MusicEngine::addNote(int note, int dur) {
	if (length >= MAX) {
		return;
	}

	melody[length] = note;
	duration[length] = dur;
	length++;
}

void MusicEngine::finish() {
	index = 0;
}

void MusicEngine::play() {
	if (length == 0) {
		return;
	}

	playing = true;
	index = 0;
	noteOn = true;
}

void MusicEngine::stop() {
	playing = false;
	noteOn = false;
}

void MusicEngine::update() {
}

bool MusicEngine::isPlaying() {
	return playing;
}

#include "../../src/core/CommandHandler.cpp"

class MockObserver : public Observer {
public:
	int callCount = 0;
	int lastValue = -1;

	void update(int value) override {
		callCount++;
		lastValue = value;
	}
};

class TestSubject : public Subject {
};

void resetState() {
	doorOpen = false;
	windowOpen = false;
	fanINA = false;
	fanINB = false;
	whiteLightOn = false;
	buzzer = false;
	orangeLight = 0;
	music.reset();
}

void test_handle_door_window_and_io_commands() {
	resetState();

	handleCommand(" D:1 ");
	TEST_ASSERT_TRUE(doorOpen);

	handleCommand("D:0");
	TEST_ASSERT_FALSE(doorOpen);

	handleCommand("N:1");
	TEST_ASSERT_TRUE(windowOpen);

	handleCommand("N:0");
	TEST_ASSERT_FALSE(windowOpen);

	handleCommand("X:1");
	TEST_ASSERT_TRUE(fanINA);

	handleCommand("X:0");
	TEST_ASSERT_FALSE(fanINA);

	handleCommand("Y:1");
	TEST_ASSERT_TRUE(fanINB);

	handleCommand("Y:0");
	TEST_ASSERT_FALSE(fanINB);

	handleCommand("W:1");
	TEST_ASSERT_TRUE(whiteLightOn);

	handleCommand("W:0");
	TEST_ASSERT_FALSE(whiteLightOn);

	handleCommand("B:1");
	TEST_ASSERT_TRUE(buzzer);

	handleCommand("B:0");
	TEST_ASSERT_FALSE(buzzer);
}

void test_handle_orange_light_is_constrained() {
	resetState();

	handleCommand("YL:120");
	TEST_ASSERT_EQUAL_INT(120, orangeLight);

	handleCommand("YL:-4");
	TEST_ASSERT_EQUAL_INT(0, orangeLight);

	handleCommand("YL:999");
	TEST_ASSERT_EQUAL_INT(255, orangeLight);
}

void test_handle_music_commands() {
	resetState();

	handleCommand("A:440,250");
	TEST_ASSERT_EQUAL_INT(1, music.length);
	TEST_ASSERT_EQUAL_INT(440, music.melody[0]);
	TEST_ASSERT_EQUAL_INT(250, music.duration[0]);

	music.index = 7;
	handleCommand("E");
	TEST_ASSERT_EQUAL_INT(0, music.index);

	handleCommand("P:1");
	TEST_ASSERT_TRUE(music.playing);

	handleCommand("P:0");
	TEST_ASSERT_FALSE(music.playing);

	music.length = 3;
	music.index = 2;
	music.playing = true;
	music.noteOn = true;
	handleCommand("C");
	TEST_ASSERT_EQUAL_INT(0, music.length);
	TEST_ASSERT_EQUAL_INT(0, music.index);
	TEST_ASSERT_FALSE(music.playing);
	TEST_ASSERT_FALSE(music.noteOn);
}

void test_unknown_command_does_not_change_state() {
	resetState();
	doorOpen = true;
	orangeLight = 77;

	handleCommand("UNKNOWN");

	TEST_ASSERT_TRUE(doorOpen);
	TEST_ASSERT_EQUAL_INT(77, orangeLight);
}

void test_subject_notifies_attached_observers() {
	TestSubject subject;
	MockObserver obs1;
	MockObserver obs2;

	subject.attach(&obs1);
	subject.attach(&obs2);
	subject.notify(42);

	TEST_ASSERT_EQUAL_INT(1, obs1.callCount);
	TEST_ASSERT_EQUAL_INT(42, obs1.lastValue);
	TEST_ASSERT_EQUAL_INT(1, obs2.callCount);
	TEST_ASSERT_EQUAL_INT(42, obs2.lastValue);
}

void test_subject_respects_max_observers() {
	TestSubject subject;
	MockObserver observers[6];

	for (int i = 0; i < 6; i++) {
		subject.attach(&observers[i]);
	}

	subject.notify(9);

	for (int i = 0; i < 5; i++) {
		TEST_ASSERT_EQUAL_INT(1, observers[i].callCount);
		TEST_ASSERT_EQUAL_INT(9, observers[i].lastValue);
	}

	TEST_ASSERT_EQUAL_INT(0, observers[5].callCount);
}

void setup() {
	UNITY_BEGIN();

	RUN_TEST(test_handle_door_window_and_io_commands);
	RUN_TEST(test_handle_orange_light_is_constrained);
	RUN_TEST(test_handle_music_commands);
	RUN_TEST(test_unknown_command_does_not_change_state);
	RUN_TEST(test_subject_notifies_attached_observers);
	RUN_TEST(test_subject_respects_max_observers);

	UNITY_END();
}

void loop() {
}
