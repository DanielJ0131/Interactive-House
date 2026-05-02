#pragma once
#include "Observer.h"

#define MAX_OBSERVERS 5

class Subject {
protected:
    Observer* observers[MAX_OBSERVERS];
    int count = 0;

public:
    void attach(Observer* obs) {
        if (count < MAX_OBSERVERS)
            observers[count++] = obs;
    }

    void notify(int value) {
        for (int i = 0; i < count; i++) {
            observers[i]->update(value);
        }
    }
};