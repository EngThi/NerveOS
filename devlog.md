# NerveOS - DevLog 🎬

This is where I track the chaos and the wins of building a cyberdeck OS in the browser. 

### The Big Pivot
Okay, so the original plan was all about PCB design and raw firmware, but ngl, I missed the browser. I decided to bring it back to where things feel fast. The goal? A mini Linux-like environment to act as the ultimate remote dashboard for my physical deck. It’s all about that "Absolute Cinema" aesthetic. ⚡

---

### v0.4.0 — THE HARDWARE BRIDGE
Got the **Web Serial API** working! 🚀 This is huge because now the browser actually talks to the ESP32-S3 over USB.
*   Added a CPU load graph using Canvas—looks sick.
*   Made a pulsing "Link Device" UI so you know when things are connected.
*   Basic data streaming is live at 115200 baud.

### v0.4.1 — Window Management Pro
Spent a whole session just making windows feel "right." A real OS needs to be snappy.
*   Maximize and restore now work.
*   Added a focus system (click a window, it comes to the top—classic).
*   Double-click the title bar to go full screen. 🖥️

### v0.4.2 — System Notifications
Built a global toast service. It’s super minimalist, slides in from the bottom right. Perfect for knowing when the hardware links up without being annoying.

### v0.4.3 — Terminal v2.0
The terminal is actually productive now.
*   Command history (up/down arrows).
*   Added a `history` command.
*   Auto-scroll logic because scrolling manually was driving me crazy.

---

### v0.5.0 — SECURITY & PANIC MODE 🧠
Inspired by the physical panic button on the deck.
*   **Panic Protocol:** One command to wipe the workspace and kill the hardware signal.
*   **System Lock:** A styled lock screen for when I step away from the station.

---

### v0.6.0 — THE INTERACTION UPDATE
Massive session to make the OS feel "alive."
*   **NerveAudio:** Built a synthetic sound engine with Web Audio. Boot sounds, clicks, and chimes—all real-time oscillators. 🔊
*   **Autocomplete:** Added `Tab` support to the terminal.
*   **Desktop Icons:** Interactive shortcuts so I don't always have to use the taskbar.

### v0.6.1 — THE EXPLORER UPDATE 📁
Mapping a nested JS object to a grid of icons was harder than I thought, but it’s done.
*   **File Explorer App:** Visual browsing for `/bin`, `/usr`, etc.
*   **Notes Integration:** This is the best part—click a `.txt` in the explorer and it opens right in the Notes app.

### v0.6.2 — PROCESS MANAGER UPDATE
As I added more apps, I needed a way to kill them when they acted up.
*   **System App:** A dashboard tracking every open window and its uptime.
*   **'ps' command:** Brought the classic Linux command to the terminal.
*   Refactored the lifecycle logic so every app registers its start time. 

### v0.6.3 — ABSOLUTE CINEMA POLISH 🎬
Alright, I felt like the UI was a bit too "soft." It needed more grit. 
*   **Industrial Borders:** Ripped out the 12px rounded corners and went with sharp 4px borders. It looks way more like industrial hardware now.
*   **Deep Glassmorphism:** Buffed the blur to 20px and cranked the saturation. Windows finally pop against the background. ✨
*   **Terminal Glow:** Added scanline textures and a subtle text-shadow to the terminal. It actually feels like a CRT now.
*   **Syntax Highlighting:** The terminal now highlights commands, arguments (the ones with `-`), and paths in different colors. It's subtle but makes a huge difference in "vibe."

**Current Status:** v0.6.3 - OPERATIONAL.
**Next Up:** Expanding the sound library and building out some hardware macros. The master plan is coming together. 🚀

### v0.6.4 — MOBILE MISSION CONTROL 📱
This session was all about making the OS a real tool for field use. If I'm away from the station, I need the phone to be a professional remote.

**What was implemented:**
1.  **Responsive Layout:**
    *   Windows now automatically go fullscreen on mobile. No more dragging windows on a 6-inch screen—they behave like real apps now.
    *   Taskbar is now thumb-friendly (70px height) and supports horizontal scrolling for app switching.
    *   Desktop icons scaled up so you don't need a stylus to click them.
2.  **Terminal Utility:**
    *   Added **Quick Commands**: A row of buttons (help, ls, status, clear) above the keyboard. Typing on mobile is annoying, so now the most common tasks are just one tap away.
    *   Increased font size for better legibility in the field.
3.  **Performance:**
    *   Disabled CRT flicker animation on mobile to save battery and keep the interface snappy.

**Current Status:** v0.6.4 - OPERATIONAL.
**Next Up:** Real hardware telemetery (killing the Math.random data) and sound library expansion.

### v0.6.5 — REAL-TIME TELEMETRY 📡
Stop playing with fake data. This session was about opening the veins of the hardware. The NerveOS now listens.

**What was implemented:**
1.  **The Data Bridge:** Replaced the Math.random() garbage with a real Serial parser. If the ESP32 sends a data packet, the OS displays it instantly.
2.  **Emergency Protocols:** Added a temperature monitor. If the deck hits 75°C while I'm in the field, the UI goes red and the NerveAudio alert triggers. It's not just an OS; it's a diagnostic station.
3.  **NerveAudio Pro:** Added a new 'alert' synth tone for critical system states. 
4.  **UI Sync:** The CPU graph now accurately reflects the hardware load the moment you hit 'LINK'.

**Current Status:** v0.6.5 - MISSION CONTROL ACTIVE. 🚀
**Next Up:** Persistence layer (IndexedDB) and building the macro library.

### v0.6.6 — PERSISTENCE & MACROS 🧠
The NerveOS now has a memory. It's no longer just a session; it's a permanent workstation.

**What was implemented:**
1.  **Virtual FS Persistence:** Every folder you create with `mkdir` and every file you `touch` is now saved to the browser's storage. You can refresh, close the tab, or reboot—your data stays. 💾
2.  **Notes Auto-Sync:** The Notes app is now fully integrated with the FS. Anything you type is saved in real-time to the virtual disk.
3.  **Macro Manager:** Built a new app dedicated to hardware automation. One-tap scripts for WiFi scanning, OLED testing, and MCU reboots. It’s about making complex tasks fast.
4.  **Terminal History:** Command history (up/down arrows) now persists between sessions. No more re-typing long serial commands.

**Current Status:** v0.6.6 - PRODUCTION READY candidate.
**Next Up:** The FINAL SHIP. UX cleanup, transitions, and the "Manual do Diretor". 🚀

### v0.6.7 — THE SHIP 🎬🚀
The Gran Finale. The NerveOS is no longer a project; it's a production-ready environment.

**What was implemented:**
1.  **Manual do Diretor (Field Guide):** Injected an official guide (`manual.txt`) into the system. New users now have a clear path to master the deck from the second they boot up.
2.  **UX Motion System:** Rewrote the window engine to support scale and opacity transitions. Windows now "breath" into existence with a subtle zoom effect. It feels premium.
3.  **Boot Optimization:** Tightened the boot sequence timing for a snappier start while maintaining the CRT calibration vibe.
4.  **Final Polish:** Updated all version strings and system statuses to v0.6.7 — THE SHIP.

**Current Status:** v0.6.7 - OPERATIONAL & SHIPPED. 💎
**Next Up:** Community review and field testing.

### v0.6.8 — THE SERIAL DIALOGUE 📡
The terminal is no longer a sandbox. It’s a live wire.

**What was implemented:**
1.  **Bidirectional Serial:** The terminal now prints everything the ESP32 sends back. It feels like a real Linux console now. Green text for incoming data, yellow italics for outgoing.
2.  **Visual Feedback:** Added specific styles for serial traffic so I can distinguish between internal OS commands and raw hardware chatter. 
3.  **Smart Buffering:** Improved the serial reader logic to handle fragmented data packets without breaking the UI.

**Current Status:** v0.6.8 - COMMUNICATION ESTABLISHED.
**Next Up:** Dynamic Macro Builder (moving away from hardcoded buttons). 🛠️
