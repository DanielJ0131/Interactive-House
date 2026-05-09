#include "GasSafety.h"
#include "../config/Config.h"

void GasSafety::check(int gasValue) {
    if (gasValue > gasThreshold) {
        notify(gasValue); // trigger observers
    }
}