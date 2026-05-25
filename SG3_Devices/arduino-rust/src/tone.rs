use embedded_hal::digital::v2::OutputPin;

pub struct Tone<P>
where
    P: OutputPin,
{
    tc2: arduino_hal::pac::TC2,
    pin: P,
}

impl<P> Tone<P>
where
    P: OutputPin,
{
    pub fn new(tc2: arduino_hal::pac::TC2, mut pin: P) -> Self {
        let _ = pin.set_low();

        let mut tone = Self { tc2, pin };
        tone.stop();
        tone
    }

    pub fn play_hz(&mut self, hz: u16) {
        if hz == 0 {
            self.stop();
            return;
        }

        let freq = hz as u32;
        if let Some((cs_bits, ocr)) = calc_timer2(freq) {
            // CTC mode, toggle OC2B (D3) on compare match.
            self.tc2.tccr2a().write(|w| w.wgm2().set(0b10).com2b().match_toggle());
            self.tc2.ocr2a().write(|w| w.set(ocr));
            self.tc2.tcnt2().write(|w| w.set(0));
            self.tc2.tccr2b().write(|w| {
                let w = w.wgm22().clear_bit();
                match cs_bits {
                    1 => w.cs2().direct(),
                    8 => w.cs2().prescale_8(),
                    32 => w.cs2().prescale_32(),
                    64 => w.cs2().prescale_64(),
                    128 => w.cs2().prescale_128(),
                    256 => w.cs2().prescale_256(),
                    _ => w.cs2().prescale_1024(),
                }
            });
        } else {
            self.stop();
        }
    }

    pub fn stop(&mut self) {
        self.tc2.tccr2a().write(|w| w.wgm2().set(0).com2b().disconnected());
        self.tc2.tccr2b().write(|w| w.cs2().no_clock());
        let _ = self.pin.set_low();
    }
}

fn calc_timer2(freq_hz: u32) -> Option<(u16, u8)> {
    const PRESCALERS: [u16; 7] = [1, 8, 32, 64, 128, 256, 1024];
    const F_CPU: u32 = 16_000_000;

    for prescaler in PRESCALERS {
        let denom = 2u32
            .saturating_mul(prescaler as u32)
            .saturating_mul(freq_hz);
        if denom == 0 {
            continue;
        }

        let top = F_CPU / denom;
        if top == 0 {
            continue;
        }

        let ocr = top.saturating_sub(1);
        if ocr <= 255 {
            return Some((prescaler, ocr as u8));
        }
    }

    None
}
