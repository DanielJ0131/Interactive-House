pub fn write_line(buf: &mut [u8; 16], text: &[u8], start: usize) {
    for (i, b) in text.iter().enumerate() {
        let idx = start + i;
        if idx < 16 {
            buf[idx] = *b;
        }
    }
}

pub fn write_u16(buf: &mut [u8; 16], value: u16, start: usize) {
    let mut tmp = [0u8; 5];
    let mut n = value;
    let mut len = 0usize;

    if n == 0 {
        tmp[0] = b'0';
        len = 1;
    } else {
        while n > 0 && len < tmp.len() {
            tmp[len] = b'0' + (n % 10) as u8;
            n /= 10;
            len += 1;
        }
        tmp[..len].reverse();
    }

    for (i, digit) in tmp[..len].iter().enumerate() {
        let idx = start + i;
        if idx < 16 {
            buf[idx] = *digit;
        }
    }
}
