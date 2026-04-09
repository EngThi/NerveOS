/**
 * NerveOS v0.4.3 - Terminal Power-Up
 * Features: Terminal history (arrows), history command, auto-scroll.
 */

const CONFIG = {
  BOOT_SPEED: 120,
  START_TIME: Date.now()
};

const STATE = {
  topZ: 100,
  drag: null,
  uptime: 0,
  serialPort: null,
  cpuHistory: new Array(30).fill(0),
  termHistory: [],
  termHistoryIndex: -1,
  fs: {
    '/': { type: 'dir', content: ['bin', 'usr', 'dev', 'readme.txt'] },
    '/bin': { type: 'dir', content: ['nerve-core', 'panic-auth'] },
    '/dev': { type: 'dir', content: ['oled0', 'serial0', 'encoder0'] },
    '/readme.txt': { type: 'file', content: 'NerveOS v0.4.3\nTerminal: ENHANCED\nAuto-scroll: ON' }
  },
  currentDir: '/'
};

// ── BOOT SEQUENCE ──────────────────────────────────
const BOOT_LINES = [
  "NerveOS v0.4.3 initializing...",
  "Loading Terminal history service...",
  "Input system: NOMINAL",
  "Web Serial API: DETECTED",
  "System status: NOMINAL",
  "Welcome back, Director."
];

async function runBoot() {
  const lineEl = document.getElementById('boot-line');
  if (!lineEl) return;
  for (const line of BOOT_LINES) {
    lineEl.textContent = line;
    await new Promise(r => setTimeout(r, CONFIG.BOOT_SPEED));
  }
  setTimeout(() => {
    document.getElementById('boot').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
    initSystem();
    notify("NerveOS Terminal Enhanced");
  }, 400);
}

// ── WINDOW MANAGEMENT ─────────────────────────────
function initWindows() {
  document.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openWindow(btn.dataset.open));
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeWindow(btn.dataset.close));
  });

  document.querySelectorAll('[data-max]').forEach(btn => {
    btn.addEventListener('click', () => toggleMaximize(btn.dataset.max));
  });

  document.querySelectorAll('.window').forEach(win => {
    win.addEventListener('mousedown', () => bringToFront(win));
  });

  document.querySelectorAll('.win-bar').forEach(bar => {
    bar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const win = bar.closest('.window');
      if (win.classList.contains('maximized')) return;
      bringToFront(win);
      const rect = win.getBoundingClientRect();
      STATE.drag = { win, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    });

    bar.addEventListener('dblclick', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const win = bar.closest('.window');
      const id = win.id.replace('win-', '');
      toggleMaximize(id);
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
    document.querySelector(`[data-open="${id}"]`)?.classList.add('active');
  }
}

function closeWindow(id) {
  const win = document.getElementById(`win-${id}`);
  if (win) {
    win.classList.add('hidden');
    win.classList.remove('maximized');
    document.querySelector(`[data-open="${id}"]`)?.classList.remove('active');
  }
}

function toggleMaximize(id) {
  const win = document.getElementById(`win-${id}`);
  if (win) {
    win.classList.toggle('maximized');
    const btn = win.querySelector('[data-max]');
    if (btn) btn.textContent = win.classList.contains('maximized') ? '❐' : '◻';
  }
}

function bringToFront(el) {
  el.style.zIndex = ++STATE.topZ;
}

// ── NOTIFICATIONS ─────────────────────────────────
function notify(msg, duration = 3000) {
  const container = document.getElementById('notif-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'notif-toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ── TERMINAL ──────────────────────────────────────
const COMMANDS = {
  help: () => `Available: help, status, ls, cd, cat, history, theme, serial, clear, uptime, version`,
  status: () => `MCU: ESP32-S3 | Link: ${STATE.serialPort ? 'CONNECTED' : 'DISCONNECTED'}`,
  history: () => STATE.termHistory.join('\n'),
  ls: () => STATE.fs[STATE.currentDir].content.join('  '),
  cd: (args) => {
    const target = args[0] === '..' ? '/' : (args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0]));
    if (STATE.fs[target] && STATE.fs[target].type === 'dir') {
      STATE.currentDir = target;
      return `Switched to ${target}`;
    }
    return `Directory not found.`;
  },
  cat: (args) => {
    const target = args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0]);
    return STATE.fs[target]?.content || `File not found.`;
  },
  theme: (args) => {
    if (!args[0]) return "Usage: theme [color-hex]";
    document.documentElement.style.setProperty('--accent', args[0]);
    localStorage.setItem('nerve_accent', args[0]);
    notify(`Theme: ${args[0]}`);
    return `Theme updated.`;
  },
  serial: () => STATE.serialPort ? `Linked to Serial. Monitoring data...` : `No link active.`,
  clear: () => { document.getElementById('term-output').innerHTML = ''; return null; },
  uptime: () => `${Math.floor((Date.now() - CONFIG.START_TIME)/1000)}s`,
  version: () => `NerveOS v0.4.3`
};

function initTerminal() {
  const input = document.getElementById('term-input');
  const output = document.getElementById('term-output');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim();
      input.value = '';
      if (!val) return;

      STATE.termHistory.push(val);
      STATE.termHistoryIndex = STATE.termHistory.length;

      printLine(`nerve@os:${STATE.currentDir}$ ${val}`, 'muted');
      const [cmd, ...args] = val.split(' ');
      if (COMMANDS[cmd]) {
        const res = COMMANDS[cmd](args);
        if (res) printLine(res, 'info');
      } else {
        printLine(`Unknown command: ${cmd}`, 'err');
      }
    } else if (e.key === 'ArrowUp') {
      if (STATE.termHistoryIndex > 0) {
        STATE.termHistoryIndex--;
        input.value = STATE.termHistory[STATE.termHistoryIndex];
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (STATE.termHistoryIndex < STATE.termHistory.length - 1) {
        STATE.termHistoryIndex++;
        input.value = STATE.termHistory[STATE.termHistoryIndex];
      } else {
        STATE.termHistoryIndex = STATE.termHistory.length;
        input.value = '';
      }
      e.preventDefault();
    }
  });

  function printLine(text, cls = '') {
    const div = document.createElement('div');
    div.className = `t-line ${cls}`;
    div.textContent = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight; // Auto-scroll
  }
}

// ── SYSTEM UTILS ──────────────────────────────────
function initMonitor() {
  const uptimeEl = document.getElementById('stat-uptime');
  const canvas = document.getElementById('cpu-graph');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  setInterval(() => {
    STATE.uptime++;
    if (uptimeEl) uptimeEl.textContent = new Date(STATE.uptime * 1000).toISOString().substr(11, 8);
    STATE.cpuHistory.push(Math.random() * 50 + 10);
    STATE.cpuHistory.shift();
    drawGraph(ctx, STATE.cpuHistory);
  }, 1000);
}

function drawGraph(ctx, data) {
  ctx.clearRect(0, 0, 300, 60);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const step = 300 / (data.length - 1);
  data.forEach((val, i) => {
    const x = i * step;
    const y = 60 - (val / 100 * 60);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

async function initSerial() {
  const btn = document.getElementById('btn-connect');
  const status = document.getElementById('serial-status');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!("serial" in navigator)) return alert("Web Serial not supported.");
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      STATE.serialPort = port;
      btn.textContent = "LINKED";
      btn.classList.add('linked');
      notify("Hardware linked @ 115200bps");
      if (status) {
        status.textContent = "CONNECTED @ 115200";
        status.style.color = "var(--accent)";
      }
    } catch (err) {
      if (status) {
        status.textContent = "LINK ERROR";
        status.style.color = "var(--danger)";
      }
    }
  });
}

function initSettings() {
  const wallSelect = document.getElementById('wallpaper-select');
  const desktop = document.getElementById('desktop');
  const wallpapers = {
    cyber1: 'url("https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop")',
    cyber2: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
    cyber3: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")'
  };
  const savedAccent = localStorage.getItem('nerve_accent');
  if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);
  const savedWall = localStorage.getItem('nerve_wallpaper');
  if (savedWall && wallSelect) {
    desktop.style.backgroundImage = wallpapers[savedWall];
    wallSelect.value = savedWall;
  }
  document.querySelectorAll('.color-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const color = opt.dataset.color;
      document.documentElement.style.setProperty('--accent', color);
      localStorage.setItem('nerve_accent', color);
      notify("Accent color updated");
    });
  });
  if (wallSelect) {
    wallSelect.addEventListener('change', (e) => {
      desktop.style.backgroundImage = wallpapers[e.target.value];
      localStorage.setItem('nerve_wallpaper', e.target.value);
      notify("Wallpaper updated");
    });
  }
}

function initSystem() {
  initWindows();
  initTerminal();
  initMonitor();
  initSettings();
  initSerial();
  initNotes();
  openWindow('terminal');
}

runBoot();
