#if !defined(ARDUINO) && !defined(PIO_UNIT_TESTING)

extern void setup();
extern void loop();

int main() {
    setup();
    loop();
    return 0;
}

#endif
