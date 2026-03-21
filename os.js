/**
 * NerveOS v0.2.0 - Core System Logic
 * Architecture: Event-driven, modular UI management.
 */

const CONFIG = {
  BOOT_SPEED: 180,
  TICK_RATE: 1000,
  START_TIME: Date.now()
};

const STATE = {
  topZ: 100,
  drag: null,
  uptime: 0
};

// ── BOOT SEQUENCE ──────────────────────────────────
const BOOT_LINES = [
  "NerveOS v0.2.0 initializing...",
  "Kernel: Linux 6.1.0-nerve-custom",
  "Checking hardware interlocks...",
  "ESP32-S3 Link: ESTABLISHED",
  "OLED Controller: SSD1351 ready",
  "Rotary Encoder: EC11 linked",
  "Loading Absolute Cinema UI...",
  "System status: NOMINAL",
  "Welcome back, Director."
];

async function runBoot() {
  const lineEl = document.getElementById('boot-line');
  for (const line of BOOT_LINES) {
    lineEl.textContent = line;
    await new Promise(r => setTimeout(r, CONFIG.BOOT_SPEED));
  }
  
  setTimeout(() => {
    document.getElementById('boot').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
    initSystem();
  }, 600);
}

// ── WINDOW MANAGEMENT ─────────────────────────────
function initWindows() {
  // Open buttons
  document.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openWindow(btn.dataset.open));
  });

  // Close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeWindow(btn.dataset.close));
  });

  // Dragging logic
  document.querySelectorAll('.win-bar').forEach(bar => {
    bar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const win = bar.closest('.window');
      bringToFront(win);
      const rect = win.getBoundingClientRect();
      STATE.drag = {
        win,
        dx: e.clientX - rect.left,
        dy: e.clientY - rect.top
      };
    });
  });

  document.addEventListener('mousemove', (e) => {
    if (!STATE.drag) return;
    STATE.drag.win.style.left = `${e.clientX - STATE.drag.dx}px`;
    STATE.drag.win.style.top = `${e.clientY - STATE.drag.dy}px`;
  });

  document.addEventListener('mouseup', () => { STATE.drag = null; });
}

function openWindow(id) {
  const win = document.getElementById(`win-${id}`);
  if (win) {
    win.classList.remove('hidden');
    bringToFront(win);
  }
}

function closeWindow(id) {
  const win = document.getElementById(`win-${id}`);
  if (win) win.classList.add('hidden');
}

function bringToFront(el) {
  el.style.zIndex = ++STATE.topZ;
}

// ── TERMINAL ──────────────────────────────────────
const COMMANDS = {
  help: () => `Available: help, status, clear, echo [msg], uptime, version`,
  status: () => `MCU: ESP32-S3\nBattery: 88%\nSignal: Strong\nLink: /dev/ttyACM0`,
  clear: () => { document.getElementById('term-output').innerHTML = ''; return null; },
  echo: (args) => args.join(' '),
  uptime: () => {
    const s = Math.floor((Date.now() - CONFIG.START_TIME) / 1000);
    return `Uptime: ${Math.floor(s/60)}m ${s%60}s`;
  },
  version: () => `NerveOS v0.2.0 "Absolute Cinema"`
};

function initTerminal() {
  const input = document.getElementById('term-input');
  const output = document.getElementById('term-output');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim();
      input.value = '';
      if (!val) return;

      printLine(`nerve@os:~$ ${val}`, 'muted');
      
      const [cmd, ...args] = val.split(' ');
      if (COMMANDS[cmd]) {
        const res = COMMANDS[cmd](args);
        if (res) printLine(res, 'info');
      } else {
        printLine(`Command not found: ${cmd}`, 'err');
      }
    }
  });

  function printLine(text, cls = '') {
    const div = document.createElement('div');
    div.className = `t-line ${cls}`;
    div.textContent = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }
}

// ── SYSTEM UTILS ──────────────────────────────────
function initClock() {
  const clock = document.getElementById('clock');
  setInterval(() => {
    clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
  }, 1000);
}

function initMonitor() {
  const uptimeEl = document.getElementById('stat-uptime');
  const encEl = document.getElementById('stat-enc');
  
  setInterval(() => {
    STATE.uptime++;
    const h = String(Math.floor(STATE.uptime / 3600)).padStart(2, '0');
    const m = String(Math.floor((STATE.uptime % 3600) / 60)).padStart(2, '0');
    const s = String(STATE.uptime % 60).padStart(2, '0');
    uptimeEl.textContent = `${h}:${m}:${s}`;
    encEl.textContent = `${Math.floor(Math.random() * 5)} rpm`;
  }, 1000);
}

function initNotes() {
  const area = document.getElementById('notes-area');
  area.value = localStorage.getItem('nerve_notes') || '';
  area.addEventListener('input', () => {
    localStorage.setItem('nerve_notes', area.value);
  });
}

function initSystem() {
  initWindows();
  initClock();
  initTerminal();
  initMonitor();
  initNotes();
  openWindow('terminal');
}

// Start sequence
runBoot();
