/**
 * NerveOS v0.2.1 - Core System Logic
 * Updates: LocalStorage persistence, Taskbar active states, Terminal theme command.
 */

const CONFIG = {
  BOOT_SPEED: 180,
  TICK_RATE: 1000,
  START_TIME: Date.now()
};

const STATE = {
  topZ: 100,
  drag: null,
  uptime: 0,
  cpuHistory: new Array(30).fill(0),
  fs: {
    '/': { type: 'dir', content: ['bin', 'usr', 'dev', 'readme.txt'] },
    '/bin': { type: 'dir', content: ['nerve-core', 'panic-auth'] },
    '/dev': { type: 'dir', content: ['oled0', 'serial0', 'encoder0'] },
    '/readme.txt': { type: 'file', content: 'NerveOS v0.2.1\nPersistence Layer Active.\nAbsolute Cinema Mode: ON' }
  },
  currentDir: '/'
};

// ── BOOT SEQUENCE ──────────────────────────────────
const BOOT_LINES = [
  "NerveOS v0.2.1 initializing...",
  "Loading user preferences...",
  "Persistence layer: READY",
  "ESP32-S3 Link: ESTABLISHED",
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
  document.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openWindow(btn.dataset.open));
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeWindow(btn.dataset.close));
  });

  document.querySelectorAll('.win-bar').forEach(bar => {
    bar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const win = bar.closest('.window');
      bringToFront(win);
      const rect = win.getBoundingClientRect();
      STATE.drag = { win, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
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
    document.querySelector(`[data-open="${id}"]`)?.classList.remove('active');
  }
}

function bringToFront(el) {
  el.style.zIndex = ++STATE.topZ;
}

// ── TERMINAL ──────────────────────────────────────
const COMMANDS = {
  help: () => `Available: help, status, ls, cd, cat, theme [color], clear, uptime, version`,
  status: () => `MCU: ESP32-S3 | Link: OK | Persistence: Active`,
  theme: (args) => {
    if (!args[0]) return "Usage: theme [color-hex]";
    const color = args[0];
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('nerve_accent', color);
    return `Theme accent updated to ${color}`;
  },
  ls: () => STATE.fs[STATE.currentDir].content.join('  '),
  cd: (args) => {
    const target = args[0] === '..' ? '/' : (args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0]));
    if (STATE.fs[target] && STATE.fs[target].type === 'dir') {
      STATE.currentDir = target;
      return `Dir: ${target}`;
    }
    return `Error: ${args[0]} not found.`;
  },
  cat: (args) => {
    const target = args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0]);
    return STATE.fs[target]?.content || `Error: File not found.`;
  },
  clear: () => { document.getElementById('term-output').innerHTML = ''; return null; },
  uptime: () => `${Math.floor((Date.now() - CONFIG.START_TIME)/1000)}s`,
  version: () => `NerveOS v0.2.1`
};

function initTerminal() {
  const input = document.getElementById('term-input');
  const output = document.getElementById('term-output');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim();
      input.value = '';
      if (!val) return;
      printLine(`nerve@os:${STATE.currentDir}$ ${val}`, 'muted');
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
  const canvas = document.getElementById('cpu-graph');
  const ctx = canvas.getContext('2d');
  
  setInterval(() => {
    STATE.uptime++;
    uptimeEl.textContent = new Date(STATE.uptime * 1000).toISOString().substr(11, 8);
    encEl.textContent = `${Math.floor(Math.random() * 5)} rpm`;
    STATE.cpuHistory.push(Math.random() * 60 + 10);
    STATE.cpuHistory.shift();
    drawGraph(ctx, STATE.cpuHistory);
  }, 1000);
}

function drawGraph(ctx, data) {
  ctx.clearRect(0, 0, 300, 60);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
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

function initSettings() {
  const wallSelect = document.getElementById('wallpaper-select');
  const desktop = document.getElementById('desktop');
  const wallpapers = {
    cyber1: 'url("https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop")',
    cyber2: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
    cyber3: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")'
  };

  // Load Saved Preferences
  const savedAccent = localStorage.getItem('nerve_accent');
  if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);

  const savedWallpaper = localStorage.getItem('nerve_wallpaper');
  if (savedWallpaper) {
    desktop.style.backgroundImage = wallpapers[savedWallpaper];
    wallSelect.value = savedWallpaper;
  }

  // Event Listeners
  document.querySelectorAll('.color-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const color = opt.dataset.color;
      document.documentElement.style.setProperty('--accent', color);
      localStorage.setItem('nerve_accent', color);
    });
  });

  wallSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    desktop.style.backgroundImage = wallpapers[val];
    localStorage.setItem('nerve_wallpaper', val);
  });
}

function initNotes() {
  const area = document.getElementById('notes-area');
  area.value = localStorage.getItem('nerve_notes') || '';
  area.addEventListener('input', () => localStorage.setItem('nerve_notes', area.value));
}

function initSystem() {
  initWindows();
  initClock();
  initTerminal();
  initMonitor();
  initSettings();
  initNotes();
  openWindow('terminal');
}

runBoot();
