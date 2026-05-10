#pragma once
#include "../core/Observer.h"

class DoorDevice : public Observer {
public:
    void update(int value) override;
};