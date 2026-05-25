use arduino_hal::prelude::*;
use arduino_hal::simple_pwm::{IntoPwmPin, Prescaler};

use crate::config::*;
use crate::display::{write_line, write_u16};
use crate::lcd::Lcd1602;
use crate::servo::DualServo;
use crate::tone::Tone;

const MAX_SONG_NOTES: usize = 150;
const CMD_BUF_MAX: usize = 256;
const LCD_WIDTH: usize = 16;

#[derive(Clone, Copy, PartialEq, Eq)]
enum GasPlan {
    None,
    OnlyAlert,
    VentOnly,
    OpenOnly,
    OpenThenVent,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum BuzzerMode {
    Off,
    Solid,
}

struct GatewayState {
    door_open: bool,
    window_open: bool,
    last_btn2_high: bool,

    white_light_on: bool,
    orange_light_value: u8,

    song_melody: [u16; MAX_SONG_NOTES],
    song_durations: [u16; MAX_SONG_NOTES],
    song_length: usize,
    upload_active: bool,
    is_playing: bool,
    current_note: usize,
    last_note_time: u32,
    note_is_sounding: bool,
    music_mode_on: bool,

    normal_beep_next_at: u32,
    normal_beep_on: bool,

    message_until: u32,
    temp_line1: [u8; LCD_WIDTH],
    temp_line2: [u8; LCD_WIDTH],
    lcd_needs_update: bool,
    last_sensor_lcd_update: u32,

    last_state_push: u32,

    startup_done: bool,
    startup_step: u8,
    startup_step_until: u32,

    gas_sequence_active: bool,
    gas_was_high: bool,
    gas_stage_until: u32,
    gas_plan: GasPlan,
    gas_plan_stage: u8,

    buzzer_mode: BuzzerMode,
    manual_buzzer_on: bool,

    fan_ina_on: bool,
    fan_inb_on: bool,
    last_btn1_high: bool,

    cmd_buf: [u8; CMD_BUF_MAX],
    cmd_len: usize,
}

impl GatewayState {
    fn new() -> Self {
        let mut line1 = [b' '; LCD_WIDTH];
        let mut line2 = [b' '; LCD_WIDTH];
        write_line(&mut line1, b"Welcome! Turning", 0);
        write_line(&mut line2, b"the device on...", 0);

        Self {
            door_open: false,
            window_open: false,
            last_btn2_high: true,
            white_light_on: false,
            orange_light_value: 0,
            song_melody: [0; MAX_SONG_NOTES],
            song_durations: [0; MAX_SONG_NOTES],
            song_length: 0,
            upload_active: false,
            is_playing: false,
            current_note: 0,
            last_note_time: 0,
            note_is_sounding: false,
            music_mode_on: false,
            normal_beep_next_at: 0,
            normal_beep_on: false,
            message_until: u32::MAX,
            temp_line1: line1,
            temp_line2: line2,
            lcd_needs_update: true,
            last_sensor_lcd_update: 0,
            last_state_push: 0,
            startup_done: false,
            startup_step: 0,
            startup_step_until: 0,
            gas_sequence_active: false,
            gas_was_high: false,
            gas_stage_until: 0,
            gas_plan: GasPlan::None,
            gas_plan_stage: 0,
            buzzer_mode: BuzzerMode::Off,
            manual_buzzer_on: false,
            fan_ina_on: false,
            fan_inb_on: false,
            last_btn1_high: true,
            cmd_buf: [0; CMD_BUF_MAX],
            cmd_len: 0,
        }
    }

    fn show_temp_message(&mut self, now_ms: u32, line1: &[u8], line2: &[u8]) {
        self.temp_line1 = [b' '; LCD_WIDTH];
        self.temp_line2 = [b' '; LCD_WIDTH];
        write_line(&mut self.temp_line1, line1, 0);
        write_line(&mut self.temp_line2, line2, 0);
        self.message_until = now_ms.wrapping_add(TEMP_MESSAGE_MS);
        self.lcd_needs_update = true;
    }

    fn set_cmd_line(&mut self, line1: &[u8], line2: &[u8]) {
        self.temp_line1 = [b' '; LCD_WIDTH];
        self.temp_line2 = [b' '; LCD_WIDTH];
        write_line(&mut self.temp_line1, line1, 0);
        write_line(&mut self.temp_line2, line2, 0);
        self.lcd_needs_update = true;
    }
}

fn line_to_str(line: &[u8; LCD_WIDTH]) -> &str {
    core::str::from_utf8(line).unwrap_or("                ")
}

fn force_show_temp_message_now<D, I2C, E>(
    lcd: &mut Option<Lcd1602<I2C>>,
    delay: &mut D,
    state: &GatewayState,
) where
    D: embedded_hal::blocking::delay::DelayMs<u16> + embedded_hal::blocking::delay::DelayUs<u16>,
    I2C: embedded_hal::blocking::i2c::Write<Error = E>,
{
    if let Some(display) = lcd.as_mut() {
        let blank = "                ";
        let _ = display.set_cursor(0, 0, delay);
        let _ = display.print(blank, delay);
        let _ = display.set_cursor(0, 0, delay);
        let _ = display.print(line_to_str(&state.temp_line1), delay);

        let _ = display.set_cursor(0, 1, delay);
        let _ = display.print(blank, delay);
        let _ = display.set_cursor(0, 1, delay);
        let _ = display.print(line_to_str(&state.temp_line2), delay);
    }
}

fn apply_buzzer_mode<P: embedded_hal::digital::v2::OutputPin>(
    state: &mut GatewayState,
    now_ms: u32,
    tone: &mut Tone<P>,
) {
    if state.music_mode_on {
        if state.normal_beep_on {
            tone.stop();
            state.normal_beep_on = false;
        }
        state.normal_beep_next_at = 0;

        if state.song_length == 0 {
            state.is_playing = false;
            state.note_is_sounding = false;
            tone.stop();
        } else if !state.is_playing {
            state.is_playing = true;
            state.current_note = 0;
            state.last_note_time = now_ms;
            if state.song_melody[0] > 0 {
                tone.play_hz(state.song_melody[0]);
                state.note_is_sounding = true;
            } else {
                tone.stop();
                state.note_is_sounding = false;
            }
        }
        return;
    }

    match state.buzzer_mode {
        BuzzerMode::Off => {
            state.is_playing = false;
            state.note_is_sounding = false;
            state.normal_beep_next_at = 0;
            state.normal_beep_on = false;
            tone.stop();
        }
        BuzzerMode::Solid => {
            state.is_playing = false;
            if state.normal_beep_next_at == 0 {
                tone.play_hz(1000);
                state.normal_beep_on = true;
                state.normal_beep_next_at = now_ms.wrapping_add(NORMAL_BEEP_ON_MS);
            } else if now_ms.wrapping_sub(state.normal_beep_next_at) < u32::MAX / 2 {
                if now_ms >= state.normal_beep_next_at {
                    if state.normal_beep_on {
                        tone.stop();
                        state.normal_beep_on = false;
                        state.normal_beep_next_at = now_ms.wrapping_add(NORMAL_BEEP_OFF_MS);
                    } else {
                        tone.play_hz(1000);
                        state.normal_beep_on = true;
                        state.normal_beep_next_at = now_ms.wrapping_add(NORMAL_BEEP_ON_MS);
                    }
                }
            }
        }
    }
}

fn music_engine<P: embedded_hal::digital::v2::OutputPin>(
    state: &mut GatewayState,
    now_ms: u32,
    tone: &mut Tone<P>,
) {
    if !state.is_playing || state.song_length == 0 {
        return;
    }

    let note_duration = state.song_durations[state.current_note] as u32;
    let sound_duration = note_duration.saturating_mul(9) / 10;
    let elapsed = now_ms.wrapping_sub(state.last_note_time);

    if state.note_is_sounding && elapsed >= sound_duration {
        tone.stop();
        state.note_is_sounding = false;
    }

    if elapsed >= note_duration {
        state.current_note += 1;

        if state.current_note >= state.song_length {
            if state.music_mode_on {
                state.current_note = 0;
            } else {
                state.is_playing = false;
                state.current_note = 0;
                tone.stop();
                return;
            }
        }

        state.last_note_time = now_ms;
        if state.song_melody[state.current_note] > 0 {
            tone.play_hz(state.song_melody[state.current_note]);
            state.note_is_sounding = true;
        } else {
            tone.stop();
            state.note_is_sounding = false;
        }
    }
}

fn normalize_song_pair(note: i32, duration: i32) -> Option<(u16, u16)> {
    if duration <= 0 {
        return None;
    }

    let mut d = duration;
    if d < 20 {
        d = 1000 / d;
    }
    if d < 60 {
        d = 60;
    }

    let mut n = note;
    if n < 0 {
        n = 0;
    }
    if n > 0 && (n < 31 || n > 5000) {
        n = 1000;
    }

    Some((n as u16, d as u16))
}

fn parse_i32_ascii(data: &[u8]) -> Option<i32> {
    if data.is_empty() {
        return None;
    }

    let mut idx = 0usize;
    let mut sign = 1i32;
    if data[idx] == b'-' {
        sign = -1;
        idx += 1;
    }

    if idx >= data.len() {
        return None;
    }

    let mut value: i32 = 0;
    let mut has_digit = false;
    while idx < data.len() {
        let c = data[idx];
        if c.is_ascii_digit() {
            has_digit = true;
            value = value.saturating_mul(10).saturating_add((c - b'0') as i32);
        } else {
            return None;
        }
        idx += 1;
    }

    if has_digit {
        Some(value.saturating_mul(sign))
    } else {
        None
    }
}

fn parse_pair_after_prefix(data: &[u8], prefix_len: usize) -> Option<(i32, i32)> {
    if data.len() <= prefix_len {
        return None;
    }
    let payload = &data[prefix_len..];
    let comma = payload.iter().position(|b| *b == b',')?;
    let left = parse_i32_ascii(&payload[..comma])?;
    let right = parse_i32_ascii(&payload[comma + 1..])?;
    Some((left, right))
}

fn play_external_song_line(state: &mut GatewayState, payload: &[u8]) {
    let mut loaded = 0usize;
    let mut idx = 0usize;

    while idx < payload.len() && loaded < MAX_SONG_NOTES {
        let note_end = match payload[idx..].iter().position(|b| *b == b',') {
            Some(p) => idx + p,
            None => break,
        };

        let note = match parse_i32_ascii(&payload[idx..note_end]) {
            Some(v) => v,
            None => break,
        };

        idx = note_end + 1;
        if idx >= payload.len() {
            break;
        }

        let dur_end = match payload[idx..].iter().position(|b| *b == b',') {
            Some(p) => idx + p,
            None => payload.len(),
        };

        let duration = match parse_i32_ascii(&payload[idx..dur_end]) {
            Some(v) => v,
            None => break,
        };

        idx = dur_end;
        if idx < payload.len() && payload[idx] == b',' {
            idx += 1;
        }

        if let Some((n, d)) = normalize_song_pair(note, duration) {
            state.song_melody[loaded] = n;
            state.song_durations[loaded] = d;
            loaded += 1;
        }
    }

    state.song_length = loaded;
    state.is_playing = false;
    state.current_note = 0;
    state.note_is_sounding = false;
}

pub fn run() -> ! {
    let dp = arduino_hal::Peripherals::take().unwrap();
    crate::timebase::init(dp.TC1);
    let pins = arduino_hal::pins!(dp);
    let mut delay = arduino_hal::Delay::new();

    unsafe { avr_device::interrupt::enable() };

    let mut serial = arduino_hal::default_serial!(dp, pins, 9600);

    let mut timer0 = arduino_hal::simple_pwm::Timer0Pwm::new(dp.TC0, Prescaler::Prescale64);

    let mut orange_light = pins.d5.into_output().into_pwm(&mut timer0);
    orange_light.enable();
    orange_light.set_duty(0);

    let mut white_led = pins.d13.into_output();
    let mut fan_ina = pins.d7.into_output();
    let mut fan_inb = pins.d6.into_output();
    let mut relay = pins.d12.into_output();
    let mut tone = Tone::new(dp.TC2, pins.d3.into_output());
    let mut servos = DualServo::new(pins.d9.into_output(), pins.d10.into_output());

    let button1 = pins.d4.into_floating_input();
    let button2 = pins.d8.into_floating_input();
    let pir_motion = pins.d2.into_floating_input();

    let mut adc = arduino_hal::Adc::new(dp.ADC, Default::default());
    let gas_pin = pins.a0.into_analog_input(&mut adc);
    let light_pin = pins.a1.into_analog_input(&mut adc);
    let soil_pin = pins.a2.into_analog_input(&mut adc);
    let steam_pin = pins.a3.into_analog_input(&mut adc);

    let i2c = arduino_hal::I2c::new(
        dp.TWI,
        pins.a4.into_pull_up_input(),
        pins.a5.into_pull_up_input(),
        100_000,
    );

    let mut lcd = Lcd1602::new(i2c, LCD_ADDRESS, &mut delay).ok();
    let mut state = GatewayState::new();
    let mut now_ms: u32 = crate::timebase::millis();

    let _ = relay.set_low();
    let _ = white_led.set_low();
    let _ = fan_ina.set_low();
    let _ = fan_inb.set_low();
    tone.stop();
    servos.set_targets(0, 0);
    servos.tick(now_ms, &mut delay);

    force_show_temp_message_now(&mut lcd, &mut delay, &state);

    tone.play_hz(1000);
    delay.delay_ms(180u16);
    tone.stop();
    delay.delay_ms(40u16);
    now_ms = crate::timebase::millis();

    state.startup_step_until = now_ms;

    loop {
        now_ms = crate::timebase::millis();

        while let Ok(c) = serial.read() {
            if c == b'\r' {
                continue;
            }

            if c == b'\n' {
                if state.cmd_len > 0 {
                    let line_len = state.cmd_len;
                    let mut line_buf = [0u8; CMD_BUF_MAX];
                    line_buf[..line_len].copy_from_slice(&state.cmd_buf[..line_len]);
                    let line = &line_buf[..line_len];

                    if line[0] == b'S' {
                        state.show_temp_message(now_ms, b"Syncing Song...", b"");
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                        play_external_song_line(&mut state, &line[1..]);
                        let _ = ufmt::uwrite!(&mut serial, "MUSIC loaded={}", state.song_length as u16);
                        if state.song_length > 0 {
                            let _ = ufmt::uwriteln!(
                                &mut serial,
                                " firstFreq={} firstDelay={}",
                                state.song_melody[0],
                                state.song_durations[0]
                            );
                        } else {
                            let _ = ufmt::uwriteln!(&mut serial, "");
                        }
                    } else if line == b"X" {
                        state.fan_ina_on = !state.fan_ina_on;
                        state.show_temp_message(now_ms, b"Fan INA", if state.fan_ina_on { b"ON" } else { b"OFF" });
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    } else if line == b"Y" {
                        state.fan_inb_on = !state.fan_inb_on;
                        state.show_temp_message(now_ms, b"Fan INB", if state.fan_inb_on { b"ON" } else { b"OFF" });
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    } else if line == b"D" || line == b"D:1" || line == b"D:0" {
                        if line == b"D:1" {
                            state.door_open = true;
                        } else if line == b"D:0" {
                            state.door_open = false;
                        } else {
                            state.door_open = !state.door_open;
                        }
                        state.show_temp_message(now_ms, b"Door", if state.door_open { b"OPEN" } else { b"CLOSE" });
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    } else if line == b"N" || line == b"N:1" || line == b"N:0" {
                        if line == b"N:1" {
                            state.window_open = true;
                        } else if line == b"N:0" {
                            state.window_open = false;
                        } else {
                            state.window_open = !state.window_open;
                        }
                        state.show_temp_message(now_ms, b"Window", if state.window_open { b"OPEN" } else { b"CLOSE" });
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    } else if line == b"B" || line == b"B:1" || line == b"B:0" {
                        if line == b"B:1" {
                            state.manual_buzzer_on = true;
                            state.show_temp_message(now_ms, b"Buzzer", b"ON");
                        } else if line == b"B:0" {
                            state.manual_buzzer_on = false;
                            state.show_temp_message(now_ms, b"Buzzer", b"OFF");
                        } else {
                            state.manual_buzzer_on = !state.manual_buzzer_on;
                            state.show_temp_message(
                                now_ms,
                                b"Buzzer",
                                if state.manual_buzzer_on { b"ON" } else { b"OFF" },
                            );
                        }
                        if !state.gas_sequence_active {
                            state.buzzer_mode = if state.manual_buzzer_on {
                                BuzzerMode::Solid
                            } else {
                                BuzzerMode::Off
                            };
                        }
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    } else if line == b"P:1" || line == b"P:0" {
                        state.music_mode_on = line == b"P:1";
                        if !state.music_mode_on {
                            state.is_playing = false;
                            state.current_note = 0;
                            state.note_is_sounding = false;
                            tone.stop();
                        } else if state.song_length > 0 {
                            if state.buzzer_mode != BuzzerMode::Off && !state.gas_sequence_active {
                                state.buzzer_mode = BuzzerMode::Off;
                            }
                            state.is_playing = true;
                            state.current_note = 0;
                            state.last_note_time = now_ms;
                            if state.song_melody[0] > 0 {
                                tone.play_hz(state.song_melody[0]);
                                state.note_is_sounding = true;
                            }
                        }
                    } else if line == b"W" {
                        state.white_light_on = !state.white_light_on;
                        state.show_temp_message(
                            now_ms,
                            b"White Light",
                            if state.white_light_on { b"ON" } else { b"OFF" },
                        );
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    } else if line == b"O" {
                        state.orange_light_value = if state.orange_light_value > 0 { 0 } else { 255 };
                        let mut msg = [b' '; LCD_WIDTH];
                        write_u16(&mut msg, state.orange_light_value as u16, 0);
                        state.set_cmd_line(b"Orange Light", &msg);
                        state.message_until = now_ms.wrapping_add(TEMP_MESSAGE_MS);
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    } else if line.starts_with(b"O:") {
                        if let Some(v) = parse_i32_ascii(&line[2..]) {
                            state.orange_light_value = v.clamp(0, 255) as u8;
                            let mut msg = [b' '; LCD_WIDTH];
                            write_u16(&mut msg, state.orange_light_value as u16, 0);
                            state.set_cmd_line(b"Orange Light", &msg);
                            state.message_until = now_ms.wrapping_add(TEMP_MESSAGE_MS);
                            force_show_temp_message_now(&mut lcd, &mut delay, &state);
                        }
                    } else if line.starts_with(b"M") {
                        let payload = &line[1..];
                        let sep = payload.iter().position(|b| *b == b'|');
                        match sep {
                            Some(i) => state.show_temp_message(now_ms, &payload[..i], &payload[i + 1..]),
                            None => state.show_temp_message(now_ms, payload, b""),
                        }
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    } else if line == b"C" {
                        state.song_length = 0;
                        state.upload_active = true;
                    } else if line.starts_with(b"A:") {
                        if state.upload_active && state.song_length < MAX_SONG_NOTES {
                            if let Some((note, duration)) = parse_pair_after_prefix(line, 2) {
                                if let Some((n, d)) = normalize_song_pair(note, duration) {
                                    state.song_melody[state.song_length] = n;
                                    state.song_durations[state.song_length] = d;
                                    state.song_length += 1;
                                }
                            }
                        }
                    } else if line == b"E" {
                        if state.upload_active {
                            state.is_playing = false;
                            state.current_note = 0;
                            state.note_is_sounding = false;
                            tone.stop();

                            if state.song_length > 0 {
                                let _ = ufmt::uwriteln!(
                                    &mut serial,
                                    "MUSIC loaded={} firstFreq={} firstDelay={}",
                                    state.song_length as u16,
                                    state.song_melody[0],
                                    state.song_durations[0]
                                );
                                if state.music_mode_on {
                                    state.is_playing = true;
                                    state.current_note = 0;
                                    state.last_note_time = now_ms;
                                    if state.song_melody[0] > 0 {
                                        tone.play_hz(state.song_melody[0]);
                                        state.note_is_sounding = true;
                                    }
                                }
                            } else {
                                let _ = ufmt::uwriteln!(&mut serial, "MUSIC loaded=0");
                            }
                        }
                        state.upload_active = false;
                    }
                }

                state.cmd_len = 0;
            } else if state.cmd_len < CMD_BUF_MAX {
                state.cmd_buf[state.cmd_len] = c;
                state.cmd_len += 1;
            }
        }

        if now_ms.wrapping_sub(state.last_sensor_lcd_update) >= SENSOR_LCD_INTERVAL_MS {
            state.last_sensor_lcd_update = now_ms;
            state.lcd_needs_update = true;
        }

        if !state.startup_done {
            if now_ms >= state.startup_step_until {
                match state.startup_step {
                    0 => {
                        orange_light.set_duty(0);
                        let _ = white_led.set_low();
                        let _ = fan_ina.set_low();
                        let _ = fan_inb.set_low();
                        let _ = relay.set_low();
                        tone.stop();

                        state.door_open = false;
                        state.window_open = false;
                        state.fan_ina_on = false;
                        state.fan_inb_on = false;
                        state.manual_buzzer_on = false;
                        state.music_mode_on = false;
                        state.gas_sequence_active = false;
                        state.gas_was_high = false;
                        state.gas_plan = GasPlan::None;
                        state.gas_plan_stage = 0;
                        state.gas_stage_until = 0;
                        state.buzzer_mode = BuzzerMode::Off;

                        state.startup_step = 1;
                        state.startup_step_until = now_ms.wrapping_add(400);
                    }
                    1 => {
                        servos.set_targets(0, 0);
                        servos.tick(now_ms, &mut delay);
                        state.startup_step = 2;
                        state.startup_step_until = now_ms.wrapping_add(600);
                    }
                    2 => {
                        let _ = white_led.set_high();
                        state.startup_step = 3;
                        state.startup_step_until = now_ms.wrapping_add(300);
                    }
                    3 => {
                        let _ = white_led.set_low();
                        state.startup_step = 4;
                        state.startup_step_until = now_ms.wrapping_add(300);
                    }
                    4 => {
                        let _ = fan_ina.set_low();
                        let _ = fan_inb.set_low();
                        state.startup_step = 5;
                        state.startup_step_until = now_ms.wrapping_add(300);
                    }
                    5 => {
                        let _ = relay.set_low();
                        state.startup_step = 6;
                        state.startup_step_until = now_ms.wrapping_add(300);
                    }
                    _ => {
                        state.startup_done = true;
                        state.show_temp_message(now_ms, b"All ready", b"");
                        force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    }
                }
            }

            delay.delay_ms(LOOP_TICK_MS as u16);
            continue;
        }

        let gas = gas_pin.analog_read(&mut adc);
        let light = light_pin.analog_read(&mut adc);
        let soil = soil_pin.analog_read(&mut adc);
        let steam = steam_pin.analog_read(&mut adc);
        let motion = pir_motion.is_high();
        let btn1_low = button1.is_low();
        let btn2_low = button2.is_low();

        let gas_high = gas > GAS_THRESHOLD;

        if gas_high && !state.gas_was_high && !state.gas_sequence_active {
            state.gas_sequence_active = true;
            state.gas_plan_stage = 0;
            state.gas_stage_until = now_ms.wrapping_add(3000);
            state.show_temp_message(now_ms, b"!! GAS ALERT !!", b"");
            force_show_temp_message_now(&mut lcd, &mut delay, &state);
            state.buzzer_mode = BuzzerMode::Solid;
            state.gas_plan = GasPlan::None;
        }

        if state.gas_sequence_active {
            if !gas_high {
                state.gas_sequence_active = false;
                state.gas_plan = GasPlan::None;
                state.gas_plan_stage = 0;
                state.gas_stage_until = 0;
                state.message_until = 0;
                state.lcd_needs_update = true;
                state.buzzer_mode = if state.manual_buzzer_on {
                    BuzzerMode::Solid
                } else {
                    BuzzerMode::Off
                };
            } else {
                if state.gas_plan_stage == 0 {
                    state.buzzer_mode = BuzzerMode::Solid;
                    if now_ms >= state.gas_stage_until {
                        let fan_on = state.fan_ina_on || state.fan_inb_on;
                        let house_open = state.door_open || state.window_open;
                        if house_open && fan_on {
                            state.gas_plan = GasPlan::OnlyAlert;
                            state.gas_plan_stage = 3;
                            state.gas_stage_until = now_ms;
                        } else if house_open && !fan_on {
                            state.gas_plan = GasPlan::VentOnly;
                            state.gas_plan_stage = 2;
                            state.gas_stage_until = now_ms;
                        } else if !house_open && !fan_on {
                            state.gas_plan = GasPlan::OpenThenVent;
                            state.gas_plan_stage = 1;
                            state.gas_stage_until = now_ms;
                        } else {
                            state.gas_plan = GasPlan::OpenOnly;
                            state.gas_plan_stage = 1;
                            state.gas_stage_until = now_ms;
                        }
                    }
                }

                if state.gas_plan_stage == 1 && now_ms >= state.gas_stage_until {
                    state.buzzer_mode = BuzzerMode::Solid;
                    if !state.door_open || !state.window_open {
                        state.door_open = true;
                        state.window_open = true;
                    }
                    state.show_temp_message(now_ms, b"Opening house", b"for safety");
                    force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    state.gas_stage_until = now_ms.wrapping_add(3000);
                    state.gas_plan_stage = if state.gas_plan == GasPlan::OpenThenVent {
                        2
                    } else {
                        3
                    };
                }

                if state.gas_plan_stage == 2 && now_ms >= state.gas_stage_until {
                    state.buzzer_mode = BuzzerMode::Solid;
                    state.fan_ina_on = true;
                    state.fan_inb_on = false;
                    state.show_temp_message(now_ms, b"Ventilator ON", b"for safety");
                    force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    state.gas_stage_until = now_ms.wrapping_add(3000);
                    state.gas_plan_stage = 3;
                }

                if state.gas_plan_stage == 3 && now_ms >= state.gas_stage_until {
                    state.buzzer_mode = BuzzerMode::Solid;
                    state.temp_line1 = [b' '; LCD_WIDTH];
                    state.temp_line2 = [b' '; LCD_WIDTH];
                    write_line(&mut state.temp_line1, b"!! GAS ALERT !!", 0);
                    state.message_until = u32::MAX;
                    state.lcd_needs_update = true;
                    force_show_temp_message_now(&mut lcd, &mut delay, &state);
                    state.gas_stage_until = now_ms.wrapping_add(1000);
                }
            }
        } else {
            state.buzzer_mode = if state.manual_buzzer_on {
                BuzzerMode::Solid
            } else {
                BuzzerMode::Off
            };
        }

        apply_buzzer_mode(&mut state, now_ms, &mut tone);
        state.gas_was_high = gas_high;

        if state.lcd_needs_update {
            state.lcd_needs_update = false;
            if let Some(display) = lcd.as_mut() {
                let blank = "                ";
                if now_ms < state.message_until {
                    let _ = display.set_cursor(0, 0, &mut delay);
                    let _ = display.print(blank, &mut delay);
                    let _ = display.set_cursor(0, 0, &mut delay);
                    let _ = display.print(line_to_str(&state.temp_line1), &mut delay);

                    let _ = display.set_cursor(0, 1, &mut delay);
                    let _ = display.print(blank, &mut delay);
                    let _ = display.set_cursor(0, 1, &mut delay);
                    let _ = display.print(line_to_str(&state.temp_line2), &mut delay);
                } else {
                    let mut top = [b' '; LCD_WIDTH];
                    let mut bot = [b' '; LCD_WIDTH];

                    write_line(&mut top, b"G:", 0);
                    write_u16(&mut top, gas, 2);
                    write_line(&mut top, b" L:", 7);
                    write_u16(&mut top, light, 10);

                    write_line(&mut bot, b"Stm:", 0);
                    write_u16(&mut bot, steam, 4);
                    write_line(&mut bot, b" Sl:", 9);
                    write_u16(&mut bot, soil, 13);

                    let _ = display.set_cursor(0, 0, &mut delay);
                    let _ = display.print(blank, &mut delay);
                    let _ = display.set_cursor(0, 0, &mut delay);
                    let _ = display.print(line_to_str(&top), &mut delay);

                    let _ = display.set_cursor(0, 1, &mut delay);
                    let _ = display.print(blank, &mut delay);
                    let _ = display.set_cursor(0, 1, &mut delay);
                    let _ = display.print(line_to_str(&bot), &mut delay);
                }
            }
        }

        if btn1_low && state.last_btn1_high {
            state.fan_ina_on = !state.fan_ina_on;
            state.show_temp_message(
                now_ms,
                b"Fan INA",
                if state.fan_ina_on { b"ON" } else { b"OFF" },
            );
        }
        state.last_btn1_high = !btn1_low;

        if state.fan_ina_on {
            let _ = fan_ina.set_high();
        } else {
            let _ = fan_ina.set_low();
        }

        if state.fan_inb_on {
            let _ = fan_inb.set_high();
        } else {
            let _ = fan_inb.set_low();
        }

        if btn2_low && state.last_btn2_high {
            let house_open = !(state.door_open || state.window_open);
            state.door_open = house_open;
            state.window_open = house_open;
            state.show_temp_message(
                now_ms,
                b"Door/Window",
                if house_open { b"OPEN" } else { b"CLOSE" },
            );
        }
        state.last_btn2_high = !btn2_low;

        servos.set_targets(if state.door_open { 150 } else { 0 }, if state.window_open { 150 } else { 0 });
        servos.tick(now_ms, &mut delay);

        if state.white_light_on {
            let _ = white_led.set_high();
        } else {
            let _ = white_led.set_low();
        }
        orange_light.set_duty(state.orange_light_value);

        music_engine(&mut state, now_ms, &mut tone);

        if now_ms.wrapping_sub(state.last_state_push) >= STATE_PUSH_INTERVAL_MS {
            state.last_state_push = now_ms;
            let _ = ufmt::uwriteln!(
                &mut serial,
                "STATE door={} window={} buzzer={} fan_ina={} fan_inb={} white_light={} orange_light={} gas={} light={} soil={} steam={} motion={}",
                if state.door_open { "open" } else { "close" },
                if state.window_open { "open" } else { "close" },
                if state.manual_buzzer_on { "on" } else { "off" },
                if state.fan_ina_on { "on" } else { "off" },
                if state.fan_inb_on { "on" } else { "off" },
                if state.white_light_on { "on" } else { "off" },
                state.orange_light_value,
                gas,
                light,
                soil,
                steam,
                motion as u8
            );
        }

        delay.delay_ms(LOOP_TICK_MS as u16);
    }
}
