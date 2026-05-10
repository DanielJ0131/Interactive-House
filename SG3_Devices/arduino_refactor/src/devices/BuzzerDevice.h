#pragma once
#include "../core/Observer.h"

class BuzzerDevice : public Observer {
public:
    void update(int value) override;
};