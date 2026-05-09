#pragma once
#include "../core/Observer.h"

class WindowDevice : public Observer {
public:
    void update(int value) override;
};