/**
 * @file Devices.h
 * @brief Low-level GPIO and servo initialisation/update interface.
 *
 * Provides two functions used by main.cpp:
 *  - initDevices(): called once in setup() to configure pin modes and attach servos.
 *  - updateDevices(): called every loop iteration to write current global state
 *    to the physical hardware outputs.
 */

#pragma once

/**
 * @brief Configure all output pins and attach servo objects to their pins.
 *
 * Pin modes set to OUTPUT:
 *   - 13: White light (digital)
 *   - 7:  Fan motor INA
 *   - 6:  Fan motor INB
 *   - 5:  Orange light (PWM)
 *   - 3:  Buzzer / tone output (PWM)
 *   - 12: Reserved output
 *
 * Servos attached:
 *   - doorServo   → pin 9
 *   - windowServo → pin 10
 */
void initDevices();

/**
 * @brief Apply current global device state to all hardware outputs.
 *
 * Called every loop iteration after sensor checks and observer notifications
 * so that any state changes are reflected on the hardware immediately.
 *
 * Behaviour:
 *  - White light (pin 13): HIGH when whiteLightOn, else LOW.
 *  - Fan INA   (pin 7):  HIGH when fanINA, else LOW.
 *  - Fan INB   (pin 6):  HIGH when fanINB, else LOW.
 *  - Orange light (pin 5): analogWrite with orangeLight (0-255).
 *  - Buzzer (pin 3): tone(1000 Hz) when buzzer is true AND music is not playing;
 *                    noTone() when buzzer is false AND music is not playing.
 *                    No change while music is playing (MusicEngine owns pin 3).
 *  - Door servo:   150° when doorOpen, 0° when closed.
 *  - Window servo: 150° when windowOpen, 0° when closed.
 */
void updateDevices();