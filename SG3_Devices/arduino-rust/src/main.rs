#![no_std]
#![no_main]
#![feature(abi_avr_interrupt)]

mod app;
mod config;
mod display;
mod lcd;
mod servo;
mod tone;
mod timebase;

use panic_halt as _;

#[arduino_hal::entry]
fn main() -> ! {
    app::run()
}
