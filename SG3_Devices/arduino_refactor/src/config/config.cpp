#include "config.h"

Servo doorServo;
Servo windowServo;
MusicEngine music;

bool doorOpen = false;
bool windowOpen = false;
bool fanINA = false;
bool fanINB = false;
bool whiteLightOn = false;
bool buzzer = false;

int yellowLED = 0;

const int gasThreshold = 100;