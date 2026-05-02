#pragma once
#include "../core/Observer.h"

class Fan : public Observer {
public:
    void update(int value) override;
};