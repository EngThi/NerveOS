# NerveOS v0.7.1

NerveOS is a web-based workstation designed for embedded developers and hardware enthusiasts. It functions as a "Digital Twin" and mission control for physical devices, specifically tailored to handle real-time serial data and hardware automation.

## The Motivation 🔧

I've always been fascinated by the process of "connecting things"—the bridge between raw code and physical hardware. This project was born from a very specific need: while developing [The Nerve](https://github.com/EngThi/The-Nerve), my physical ESP32-S3 cyberdeck, I wanted a clean, professional dashboard to monitor its telemetry and send commands without having to rely on the generic (and often cluttered) Arduino Serial Monitor.

NerveOS is the software side of that passion. It’s an environment that respects the "Absolute Cinema" aesthetic while providing actual utility for field operations.

---

## Core Features 🛠️

### 1. Real Bidirectional Serial Console
Unlike most Web-OS projects that are purely cosmetic, NerveOS uses the **Web Serial API** to talk to hardware.
* **Green lines (←):** Data coming from the ESP32.
* **Yellow lines (→):** Commands sent from the browser.
* Supports multiple Baud Rates (9600, 115200, 230400).

![Serial Console in Action](assets/serial-console.png)

### 2. Neural Flash IDE (Hardware Simulator)
For users without a physical microcontroller, I built a micro-IDE that simulates the entire deployment process.
* **Verification:** It requires a real USB device connection before initiating the "flash" sequence.
* **Mock Telemetry:** Once "flashed," it injects high-fidelity CPU and temperature data into the system.

![Neural Flash IDE](assets/simulator-ide.png)

### 3. Dynamic Macro Builder
A dedicated library for hardware automation.
* Add, edit, and delete custom serial commands.
* All macros are persisted in the browser's local storage.

![Macro Manager](assets/macro-manager.png)

### 4. Notes Pro & Persistence
A built-in Markdown editor to document your sessions.
* **Auto-Sync:** Real-time saving to the virtual file system.
* **Export:** Download your technical logs as `.md` files.

---

## Technical Visuals 

The OS uses a customized "Absolute Cinema" theme:
* **Sharp Borders:** 4px industrial-style window borders.
* **Deep Glassmorphism:** 20px blur with high-saturation backdrops.
* **CRT Simulation:** Integrated scanlines and flicker effects for that vintage hardware feel.
* **Mobile Ready:** A specific "Mission Control" layout for field use on smartphones.

![Desktop Overview](assets/hero-shot.png)

##Hardware Setup

1. **Firmware:** Flash the provided `firmware/firmware.ino` to your ESP32.
2. **Connection:** Open the OS in Chrome/Edge and click **LINK DEVICE**.
3. **Simulation:** If you have no ESP32, use the **SIMULATOR** button in the HW Monitor app.

---

## Credits
Built with passion by **ChefThi** (The Director), for other directors.  
Inspired by the hardware hacking community and the need for better dev tools. In addition to having something more connected to my own cyberdeck 💻

 
