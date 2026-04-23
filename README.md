# NerveOS v0.7.1

![Version](https://img.shields.io/badge/version-0.7.1-00ffb4?style=flat-square)
![Status](https://img.shields.io/badge/status-operational-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

NerveOS is a web-based workstation I built to talk to my microcontrollers. It’s basically a "Digital Twin" and mission control for my hardware projects, made to handle real-time serial data and automation without the clutter of the standard Arduino monitor.

![Desktop Overview](assets/hero-shot.png)

## Why I built this

I’m a Computer Engineering student and I spend a lot of time on the bus. I needed a way to monitor my ESP32-S3 cyberdeck ([The Nerve](https://github.com/EngThi/The-Nerve)) without having to carry a laptop everywhere. I wanted a professional-looking dashboard that actually works on a mobile browser and lets me send commands on the fly.

---

## What it does

### Serial Console
The real deal. It uses the **Web Serial API** to talk to the ESP32.
* **Green (←):** Data coming from the hardware.
* **Yellow (→):** Commands I’m sending.
* Supports 9600, 115200, and 230400 Baud Rates.

![Serial Console](assets/serial-console.png)

### Hardware Monitor
Real-time tracking so I know if the ESP32 is alive.
* **CPU & Stats:** Visual graphs for load and temperature.
* **Status:** Quick indicators to see if the link is active.

![Hardware Monitor](assets/monitor.png)

### Dynamic Macro Builder
I got tired of typing the same commands over and over.
* I can create and save custom serial commands.
* Everything is saved in `localStorage` so it doesn't vanish when I refresh.

![Macro Manager](assets/macro-manager.png)

### Notes Pro
A simple Markdown editor inside the OS.
* I use this to write my devlogs or technical notes.
* I can export everything as `.md` files when I'm done.

---


I wanted an industrial look that’s actually usable on a phone:
* **Sharp Borders:** No rounded corners, just 4px solid borders.
* **Glassmorphism:** Heavy blur so the text stays readable over the wallpaper.
* **Mobile Ready:** I spent a lot of time making sure the buttons and windows work on a small touch screen.

## How to use it

1. **Firmware:** Flash `firmware/firmware.ino` to your ESP32.
2. **Link:** Hit **LINK DEVICE** in the HW Monitor.
3. **No Hardware?** Use the **SIMULATOR** button to see how the telemetry looks.

---

## AI Usage Disclosure

I'm writing this myself now because I messed up the last one. I actually used AI to write that previous declaration because I was scared I wouldn't be able to explain exactly how and where I used it in English. I also used AI to translate the whole README and to help me get the technical tone right for each section.

For the project itself, I used AI to help me with CSS debugging (like the scrollbars and contrast) because fixing that on a mobile browser is a pain. I also used it to research how to handle Web Serial buffers and the logic for exporting Markdown files. It also helped me refactor some of the loops in the Macro Builder when I got stuck.

The core logic and the project idea are mine. I just used AI as a tool for translation and to help me when I hit a wall with specific technical parts.

---

> Built by **ChefThi**. This is the software half of my cyberdeck project. I just wanted a tool that didn't look like a 90s spreadsheet. 😎
