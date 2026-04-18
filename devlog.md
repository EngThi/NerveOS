# NerveOS Development Log

### The Big Pivot
The original plan for this project was always a web-based interface for hardware control. After spending time on PCB design and raw firmware, I decided to bring the focus back to the browser. The goal is to create a functional, mini Linux-like environment that serves as the remote dashboard for my physical cyberdeck.

---

### v0.4.0 - Hardware Bridge
I successfully implemented the **Web Serial API**. This is a major win because it allows the browser to communicate directly with the ESP32-S3 hardware over USB. 
*   Added a real-time CPU load graph using the Canvas API.
*   Implemented a pulsing "Link Device" UI to show connection status.
*   Established basic data streaming at 115200 baud.

### v0.4.1 - Window Management Pro
Spent a session refining the user experience. A real OS needs to feel snappy.
*   Added maximize/restore functionality for all windows.
*   Implemented a focus system where clicking any window part brings it to the top.
*   Enabled double-clicking the title bar to toggle full-screen mode.

### v0.4.2 - System Notifications
Built a global toast notification service. It provides essential feedback for system events like hardware linking and theme updates. The UI is minimalist, sliding in from the bottom right with a smooth fade-out.

### v0.4.3 - Terminal v2.0
The terminal is now much more productive.
*   Added command history (navigate with up/down arrows).
*   Implemented a `history` command.
*   Added auto-scroll logic so the terminal stays focused on the latest output.

### v0.4.4 - Hardware Control & Macros
Implemented bidirectional communication. The OS can now send commands back to the deck.
*   Added an `oled` command to push custom text to the hardware display.
*   Implemented a `reboot` command for the MCU.
*   Added a "Quick Actions" section in the hardware monitor for macros like clearing the display.

---

### v0.5.0 - Security & Panic Mode
Integrated safety features inspired by the project's original hardware panic button.
*   **Panic Protocol:** A terminal command that wipes the current workspace, closes all windows, and sends a shutdown signal to the hardware.
*   **System Lock:** A styled lock screen overlay that secures the session when away from the station.

---

### v0.6.0 - The Interaction Update
A massive session focused on making the environment feel "alive."
*   **NerveAudio:** Built a synthetic sound engine using the Web Audio API. It generates oscillators in real-time for boot sounds, clicks, and chimes.
*   **Autocomplete:** Added `Tab` support to the terminal for faster command entry.
*   **Desktop Icons:** Added interactive shortcuts on the desktop, reducing reliance on the taskbar.
*   **Filesystem Ops:** Added `mkdir` and `touch` commands to interact with the mock file data.

---

### v0.6.1 - The Explorer Update 📁
Alright, this was a big step for the filesystem. Up until now, the mock files were only accessible via terminal commands like `ls` and `cd`. I decided it was time for a visual layer.

**The Challenges:**
The main difficulty was mapping a nested JavaScript object (the mock FS) to a dynamic grid of icons. I had to ensure that clicking a folder correctly updated the `STATE.explorerDir` and re-rendered the UI without losing track of where the user was.

**What was implemented:**
1.  **File Explorer App:** A new visual app to browse directories like `/bin`, `/usr`, and `/dev`.
2.  **Navigation Logic:** Added a "Back" button functionality and breadcrumb path tracking.
3.  **Notes Integration:** This is the most useful part. If you click a `.txt` file in the explorer, the system automatically opens the Notes app and loads that file's content into the editor.
4.  **UI Polish:** Icons change based on file type (folders vs files) and have a clean hover effect that matches the "Absolute Cinema" aesthetic.

The NerveOS is starting to feel like a real workspace. The bridge between the visual explorer and the terminal makes navigation much more intuitive.

### v0.6.2 - Process Manager Update
This session was all about system control. I realized that as the number of apps grew, I needed a way to monitor and manage them all in one place. I built a Process Manager (the "System" app) that tracks every open window.

**The Challenges:**
The tricky part was ensuring the process list stayed in sync with the actual window states. I had to refactor the `openWindow` and `closeWindow` functions to update a central `STATE.processes` Map. I also had to implement a real-time refresh logic so the uptime counters for each process would update every second without lagging the UI.

**What was implemented:**
1. **System App:** A new dashboard that lists all running processes, their status, and how long they've been active.
2. **Process Termination:** Added a 'KILL' button to the dashboard. It's essentially a remote trigger to close any app from a single list.
3. **'ps' Command:** Brought the classic Linux command to the terminal. Now I can list processes via text or UI.
4. **Centralized Lifecycle:** All apps now register their start time when opened, giving me better telemetry on how the OS is being used.

It feels much more like a robust engineering station now. The ability to see exactly what's eating up my mental space (or screen space) is great for the workflow.

**Current Status:** v0.6.2 - OPERATIONAL.
**Next Up:** Terminal syntax highlighting and visual polish.

### v0.6.3 - Visual Polish & Syntax
This session focused on elevating the "Absolute Cinema" aesthetic and making the terminal more professional.

**What was implemented:**
1.  **Visual Polish:**
    *   Transitioned from rounded 12px corners to sharp 4px borders for a more "industrial" cyberdeck feel.
    *   Enhanced glassmorphism: windows now use `blur(20px)` and higher saturation for better legibility against the wallpaper.
    *   Dynamic window scaling: active windows now have a subtle `scale(1.005)` effect.
2.  **Terminal Syntax Highlighting:**
    *   Implemented a logic to detect valid commands, arguments (prefixed with `-`), and paths.
    *   Added real-time highlighting for the command prompt.
    *   Added a hover state for terminal lines to improve interactive feedback.
3.  **CRT Refinement:**
    *   Adjusted CRT overlay opacity for a cleaner look while maintaining the vintage hardware vibe.
    *   Added scanline textures directly to the terminal body.

**Current Status:** v0.6.3 - OPERATIONAL.
**Next Up:** System-wide sound effects expansion and hardware macro library.
