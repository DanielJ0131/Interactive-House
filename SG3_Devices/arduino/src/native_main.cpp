/**
 * @file native_main.cpp
 * @brief Native (non-Arduino) entry point used for host-side testing.
 *
 * When building outside the Arduino/PlatformIO embedded target (i.e. not
 * defined(ARDUINO) and not defined(PIO_UNIT_TESTING)), this file provides a
 * standard C++ main() that exercises one iteration of the firmware by calling
 * setup() followed by loop().
 *
 * This allows basic compilation and smoke-testing of the firmware logic on a
 * desktop machine without physical hardware.
 */

#if !defined(ARDUINO) && !defined(PIO_UNIT_TESTING)

extern void setup();
extern void loop();

int main() {
    setup();
    loop();
    return 0;
}

#endif
