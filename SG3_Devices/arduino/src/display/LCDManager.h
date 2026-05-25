/**
 * @file LCDManager.h
 * @brief Wrapper around the 16x2 I2C LCD display.
 *
 * Manages a LiquidCrystal_I2C display at I2C address 0x27 with 16 columns
 * and 2 rows.  Provides a simple show() interface so the rest of the firmware
 * does not need to interact with the LiquidCrystal library directly.
 */

#pragma once
#include <Arduino.h>
#include <LiquidCrystal_I2C.h>

/**
 * @class LCDManager
 * @brief High-level controller for a 16x2 I2C character LCD.
 *
 * Usage:
 *  1. Construct an LCDManager (no arguments needed).
 *  2. Call init() once in setup() to initialise the hardware and show the
 *     startup message.
 *  3. Call show() each time the displayed content should change.
 */
class LCDManager {
public:
    /**
     * @brief Constructor: initialises the LiquidCrystal_I2C object.
     *
     * Sets up the I2C LCD driver for address 0x27, 16 columns, 2 rows.
     * Does not communicate with the hardware yet; call init() for that.
     */
    LCDManager();

    /**
     * @brief Initialise the LCD hardware and display the startup message.
     *
     * Calls lcd.init(), enables the backlight, and prints "System Ready" on
     * line 1.  Must be called once in setup() before any show() calls.
     */
    void init();

    /**
     * @brief Update both display lines with new content.
     *
     * Clears each line by overwriting with 16 spaces before printing the new
     * text, avoiding display artefacts from variable-length strings.
     * Each string is truncated at 16 characters by the display hardware.
     *
     * @param l1 Text for line 1 (row 0), up to 16 characters.
     * @param l2 Text for line 2 (row 1), up to 16 characters.
     */
    void show(String l1, String l2);

private:
    LiquidCrystal_I2C lcd; ///< Underlying I2C LCD driver instance.
};