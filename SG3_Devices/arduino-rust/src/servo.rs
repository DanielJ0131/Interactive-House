use embedded_hal::blocking::delay::{DelayMs, DelayUs};
use embedded_hal::digital::v2::OutputPin;

const SERVO_FRAME_MS: u32 = 20;

fn pulse_servo<P, D>(pin: &mut P, angle: u8, delay: &mut D)
where
    P: OutputPin,
    D: DelayUs<u16>,
{
    let clamped = if angle > 180 { 180 } else { angle } as u32;
    let pulse_us = 1000u32 + (clamped * 1000u32 / 180u32);

    let _ = pin.set_high();
    delay.delay_us(pulse_us as u16);
    let _ = pin.set_low();
}

pub struct DualServo<P1, P2>
where
    P1: OutputPin,
    P2: OutputPin,
{
    door: P1,
    window: P2,
    door_angle: u8,
    window_angle: u8,
    last_frame_ms: u32,
}

impl<P1, P2> DualServo<P1, P2>
where
    P1: OutputPin,
    P2: OutputPin,
{
    pub fn new(door: P1, window: P2) -> Self {
        Self {
            door,
            window,
            door_angle: 0,
            window_angle: 0,
            last_frame_ms: 0,
        }
    }

    pub fn set_targets(&mut self, door_angle: u8, window_angle: u8) {
        self.door_angle = door_angle;
        self.window_angle = window_angle;
    }

    pub fn tick<D>(&mut self, now_ms: u32, delay: &mut D)
    where
        D: DelayUs<u16> + DelayMs<u16>,
    {
        if now_ms.wrapping_sub(self.last_frame_ms) < SERVO_FRAME_MS {
            return;
        }

        self.last_frame_ms = now_ms;
        pulse_servo(&mut self.door, self.door_angle, delay);
        pulse_servo(&mut self.window, self.window_angle, delay);
    }
}
