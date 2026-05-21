/**
 * @file Sensors.h
 * @brief Sensor pin definitions and unified sensor-read interface.
 *
 * Defines the analogue and digital input pins for all environmental sensors
 * and declares the SensorData struct that carries a single snapshot of all
 * sensor readings.
 *
 * Analogue pins return values in [0, 1023] (10-bit ADC).
 * The digital motion pin returns 0 or 1.
 */

#pragma once
#include <Arduino.h>

#define GAS_PIN          A0  ///< Analogue input for gas / smoke sensor.
#define LIGHT_PIN        A1  ///< Analogue input for ambient light sensor.
#define ORANGE_LIGHT_PIN 5   ///< PWM output for orange light (also defined in Config.h).
#define SOIL_PIN         A2  ///< Analogue input for soil moisture sensor.
#define STEAM_PIN        A3  ///< Analogue input for steam / humidity sensor.
#define MOTION_PIN       2   ///< Digital input for PIR motion detector.

/**
 * @struct SensorData
 * @brief Snapshot of all sensor readings captured in one call to readSensors().
 */
struct SensorData {
    int gas;    ///< Gas sensor ADC value [0-1023].  Higher = more gas detected.
    int light;  ///< Light sensor ADC value [0-1023].  Higher = brighter ambient light.
    int soil;   ///< Soil moisture ADC value [0-1023].  Higher = more moisture.
    int steam;  ///< Steam/humidity ADC value [0-1023].  Higher = more steam.
    int motion; ///< PIR motion detector: 1 = motion detected, 0 = no motion.
};

/**
 * @brief Sample all sensors and return the readings as a SensorData struct.
 *
 * Reads four analogue pins (A0-A3) and one digital pin (2) and packs them
 * into a SensorData value.  This function is called once per main loop
 * iteration so that all subsequent logic in the loop works with a consistent
 * snapshot.
 *
 * @return SensorData containing gas, light, soil, steam, and motion readings.
 */
SensorData readSensors();