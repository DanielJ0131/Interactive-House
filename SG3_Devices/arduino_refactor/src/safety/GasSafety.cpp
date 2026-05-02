#include "GasSafety.h"
#include "../config/config.h"

void GasSafety::check(int gasValue) {
    if (gasValue > gasThreshold) {
        notify(gasValue); // trigger observers
    }
}