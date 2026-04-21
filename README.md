# NerveOS v0.7.0

**A professional browser-based OS for embedded developers.** 
Connect your ESP32 via USB and get a real serial console, hardware monitor, and dynamic macro launcher — all in one cyberpunk interface.

## Live Demo
👉 https://engThi.github.io/NerveOS

## Features

| Feature | Status |
|---|---|
| **Web Serial Console** | Bidirectional real-time dialogue |
| **Hardware Telemetry** | Real CPU & Temp monitoring (ESP32) |
| **Macro Builder** | Custom hardware automation scripts |
| **Notes Pro** | Markdown editor with .md export |
| **Virtual FS** | Persistent storage via localStorage |
| **Absolute Cinema** | CRT aesthetics + synthetic audio |

## Hardware Setup

1. Flash `firmware/serial_echo.ino` to your ESP32.  
2. Open NerveOS → HW Monitor → **LINK DEVICE**.
3. Set your Baud Rate in **Settings** (Default: 115200).

## Requirements

- Chrome or Edge (Web Serial API support).
- ESP32 or RP2040 connected via USB-Serial.
