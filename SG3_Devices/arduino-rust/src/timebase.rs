use core::cell::Cell;

static MILLIS_COUNTER: avr_device::interrupt::Mutex<Cell<u32>> =
    avr_device::interrupt::Mutex::new(Cell::new(0));

pub fn init(tc1: arduino_hal::pac::TC1) {
    // 16 MHz / 64 = 250 kHz. CTC top=249 gives 1 ms per compare match.
    tc1.tccr1a().write(|w| w.wgm1().set(0b00));
    tc1.tccr1b().write(|w| w.cs1().prescale_64().wgm1().set(0b01));
    tc1.ocr1a().write(|w| w.set(249));
    tc1.timsk1().write(|w| w.ocie1a().set_bit());

    avr_device::interrupt::free(|cs| {
        MILLIS_COUNTER.borrow(cs).set(0);
    });
}

pub fn millis() -> u32 {
    avr_device::interrupt::free(|cs| MILLIS_COUNTER.borrow(cs).get())
}

#[avr_device::interrupt(atmega328p)]
fn TIMER1_COMPA() {
    avr_device::interrupt::free(|cs| {
        let counter = MILLIS_COUNTER.borrow(cs);
        counter.set(counter.get().wrapping_add(1));
    });
}
