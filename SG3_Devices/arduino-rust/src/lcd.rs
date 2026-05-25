use embedded_hal::blocking::delay::{DelayMs, DelayUs};
use embedded_hal::blocking::i2c::Write as I2cWrite;

const LCD_BACKLIGHT: u8 = 0x08;
const LCD_ENABLE: u8 = 0x04;
const LCD_RS: u8 = 0x01;

pub struct Lcd1602<I2C> {
    i2c: I2C,
    addr: u8,
    backlight: u8,
}

impl<I2C, E> Lcd1602<I2C>
where
    I2C: I2cWrite<Error = E>,
{
    pub fn new<D>(i2c: I2C, addr: u8, delay: &mut D) -> Result<Self, E>
    where
        D: DelayMs<u16> + DelayUs<u16>,
    {
        let mut lcd = Self {
            i2c,
            addr,
            backlight: LCD_BACKLIGHT,
        };

        delay.delay_ms(50u16);
        lcd.write_nibble(0x30, delay)?;
        delay.delay_ms(5u16);
        lcd.write_nibble(0x30, delay)?;
        delay.delay_us(150u16);
        lcd.write_nibble(0x30, delay)?;
        lcd.write_nibble(0x20, delay)?;

        lcd.command(0x28, delay)?;
        lcd.command(0x08, delay)?;
        lcd.command(0x01, delay)?;
        delay.delay_ms(2u16);
        lcd.command(0x06, delay)?;
        lcd.command(0x0C, delay)?;

        Ok(lcd)
    }

    #[allow(dead_code)]
    pub fn clear<D>(&mut self, delay: &mut D) -> Result<(), E>
    where
        D: DelayMs<u16> + DelayUs<u16>,
    {
        self.command(0x01, delay)?;
        delay.delay_ms(2u16);
        Ok(())
    }

    pub fn set_cursor<D>(&mut self, col: u8, row: u8, delay: &mut D) -> Result<(), E>
    where
        D: DelayMs<u16> + DelayUs<u16>,
    {
        let row_offset = if row == 0 { 0x00 } else { 0x40 };
        self.command(0x80 | (col + row_offset), delay)
    }

    pub fn print<D>(&mut self, text: &str, delay: &mut D) -> Result<(), E>
    where
        D: DelayMs<u16> + DelayUs<u16>,
    {
        for b in text.bytes() {
            self.send(b, LCD_RS, delay)?;
        }
        Ok(())
    }

    fn command<D>(&mut self, value: u8, delay: &mut D) -> Result<(), E>
    where
        D: DelayMs<u16> + DelayUs<u16>,
    {
        self.send(value, 0, delay)
    }

    fn send<D>(&mut self, value: u8, mode: u8, delay: &mut D) -> Result<(), E>
    where
        D: DelayMs<u16> + DelayUs<u16>,
    {
        let high = value & 0xF0;
        let low = (value << 4) & 0xF0;
        self.write_nibble(high | mode, delay)?;
        self.write_nibble(low | mode, delay)?;
        Ok(())
    }

    fn write_nibble<D>(&mut self, value: u8, delay: &mut D) -> Result<(), E>
    where
        D: DelayMs<u16> + DelayUs<u16>,
    {
        self.write_byte(value)?;
        self.write_byte(value | LCD_ENABLE)?;
        delay.delay_us(1u16);
        self.write_byte(value & !LCD_ENABLE)?;
        delay.delay_us(50u16);
        Ok(())
    }

    fn write_byte(&mut self, value: u8) -> Result<(), E> {
        self.i2c.write(self.addr, &[value | self.backlight])
    }
}
