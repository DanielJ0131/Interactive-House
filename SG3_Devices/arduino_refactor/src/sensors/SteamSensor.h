#pragma once
#include "../core/Subject.h"

class SteamSensor : public Subject {
public:
    void check(int steamValue);
};