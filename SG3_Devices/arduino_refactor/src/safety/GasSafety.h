#pragma once
#include "../core/Subject.h"

class GasSafety : public Subject {
public:
    void check(int gasValue);
};