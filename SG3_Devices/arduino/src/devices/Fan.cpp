/**
 * @file Fan.cpp
 * @brief Fan Observer implementation.
 */

#include "Fan.h"
#include "../config/Config.h"

void Fan::update(int value) {
    fanINA = true;
    fanINB = false;
}