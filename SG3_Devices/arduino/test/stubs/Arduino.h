#pragma once

#include <stdint.h>
#include <stdlib.h>
#include <algorithm>
#include <cctype>
#include <chrono>
#include <string>

#ifndef HIGH
#define HIGH 0x1
#endif
#ifndef LOW
#define LOW 0x0
#endif
#ifndef OUTPUT
#define OUTPUT 0x1
#endif
#ifndef INPUT
#define INPUT 0x0
#endif
#ifndef INPUT_PULLUP
#define INPUT_PULLUP 0x2
#endif

#ifndef A0
#define A0 14
#endif
#ifndef A1
#define A1 15
#endif
#ifndef A2
#define A2 16
#endif
#ifndef A3
#define A3 17
#endif
#ifndef A4
#define A4 18
#endif
#ifndef A5
#define A5 19
#endif

class String {
public:
    String() = default;
    String(const char *cstr) : data_(cstr ? cstr : "") {}
    String(char c) : data_(1, c) {}
    String(int value) : data_(std::to_string(value)) {}
    String(unsigned long value) : data_(std::to_string(value)) {}
    String(const std::string &s) : data_(s) {}

    int length() const {
        return static_cast<int>(data_.size());
    }

    void trim() {
        auto is_space = [](unsigned char ch) { return std::isspace(ch) != 0; };
        data_.erase(data_.begin(), std::find_if_not(data_.begin(), data_.end(), is_space));
        data_.erase(std::find_if_not(data_.rbegin(), data_.rend(), is_space).base(), data_.end());
    }

    bool startsWith(const char *prefix) const {
        if (!prefix) {
            return false;
        }
        std::string p(prefix);
        if (p.size() > data_.size()) {
            return false;
        }
        return data_.compare(0, p.size(), p) == 0;
    }

    int indexOf(char ch) const {
        auto pos = data_.find(ch);
        if (pos == std::string::npos) {
            return -1;
        }
        return static_cast<int>(pos);
    }

    String substring(int start) const {
        return substring(start, length());
    }

    String substring(int start, int end) const {
        if (start < 0) {
            start = 0;
        }
        if (end < start) {
            end = start;
        }
        int max_len = length();
        if (start > max_len) {
            start = max_len;
        }
        if (end > max_len) {
            end = max_len;
        }
        return String(data_.substr(static_cast<size_t>(start), static_cast<size_t>(end - start)));
    }

    long toInt() const {
        return std::strtol(data_.c_str(), nullptr, 10);
    }

    const std::string &str() const {
        return data_;
    }

    const char *c_str() const {
        return data_.c_str();
    }

    String &operator+=(char c) {
        data_.push_back(c);
        return *this;
    }

    String &operator+=(const char *s) {
        if (s) {
            data_ += s;
        }
        return *this;
    }

    String &operator+=(const String &other) {
        data_ += other.data_;
        return *this;
    }

    friend String operator+(const String &a, const String &b) {
        return String(a.data_ + b.data_);
    }

    friend String operator+(const String &a, const char *b) {
        return String(a.data_ + (b ? b : ""));
    }

    friend String operator+(const char *a, const String &b) {
        return String(std::string(a ? a : "") + b.data_);
    }

    friend bool operator==(const String &a, const String &b) {
        return a.data_ == b.data_;
    }

    friend bool operator==(const String &a, const char *b) {
        return a.data_ == (b ? b : "");
    }

    friend bool operator==(const char *a, const String &b) {
        return (a ? a : "") == b.data_;
    }

    friend bool operator!=(const String &a, const String &b) {
        return !(a == b);
    }

    friend bool operator!=(const String &a, const char *b) {
        return !(a == b);
    }

    friend bool operator!=(const char *a, const String &b) {
        return !(a == b);
    }

private:
    std::string data_;
};

inline void pinMode(int, int) {}
inline void digitalWrite(int, int) {}
inline void analogWrite(int, int) {}
inline int analogRead(int) { return 0; }
inline int digitalRead(int) { return 0; }
inline void tone(int, int) {}
inline void noTone(int) {}

inline unsigned long millis() {
    using namespace std::chrono;
    static auto start = steady_clock::now();
    return static_cast<unsigned long>(duration_cast<milliseconds>(steady_clock::now() - start).count());
}

inline void delay(unsigned long) {}

template <typename T>
inline T constrain(T value, T min_val, T max_val) {
    return std::min(std::max(value, min_val), max_val);
}

class HardwareSerial {
public:
    void begin(unsigned long) {}
    int available() { return 0; }
    char read() { return 0; }

    void print(const String &) {}
    void print(const char *) {}
    void print(char) {}
    void print(int) {}
    void print(unsigned long) {}
    void print(bool) {}

    void println() {}
    void println(const String &) {}
    void println(const char *) {}
    void println(char) {}
    void println(int) {}
    void println(unsigned long) {}
    void println(bool) {}
};

static HardwareSerial Serial;
