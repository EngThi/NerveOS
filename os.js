/**
 * NerveOS v0.7.0 - The Polish Update
 * Features: CRT Scanlines (Toggle), Active window glow, Stable Core.
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
  serialWriter: null,
  termHistory: [],
  termHistoryIndex: -1,
  audioEnabled: true,
  scanlines: true,
  processes: new Map(),
  fs: {
    '/': { type: 'dir', content: ['bin', 'usr', 'dev', 'readme.txt'] },
    '/bin': { type: 'dir', content: ['nerve-core', 'panic-auth'] },
    '/dev': { type: 'dir', content: ['oled0', 'serial0', 'encoder0'] },
    '/readme.txt': { type: 'file', content: 'NerveOS v0.7.0\nCRT Emulation: ACTIVE\nProduction Candidate.' }
  },
  currentDir: '/',
  explorerDir: '/'
};

// ── NerveAudio ─────────────────────────────────────
const NerveAudio = {
  ctx: null,
  init() { if (this.ctx) return; this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  play(type) {
    if (!STATE.audioEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    if (type === 'click') { osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.05); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05); osc.start(); osc.stop(now + 0.05); }
    else if (type === 'notif') { osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(); osc.stop(now + 0.2); }
    else if (type === 'boot') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(50, now); osc.frequency.exponentialRampToValueAtTime(400, now + 1); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 1); osc.start(); osc.stop(now + 1); }
  }
};

// ── BOOT SEQUENCE ──────────────────────────────────
const BOOT_LINES = [
  "NerveOS v0.7.0 initializing...",
  "Calibrating scanline generators...",
  "Initializing CRT emulation kernel...",
  "Web Serial API: DETECTED",
  "System status: ABSOLUTE CINEMA",
  "Welcome back, Director."
];

async function runBoot() {
  const lineEl = document.getElementById('boot-line'); if (!lineEl) return;
  document.addEventListener('mousedown', () => NerveAudio.init(), { once: true });
  for (const line of BOOT_LINES) { lineEl.textContent = line; await new Promise(r => setTimeout(r, CONFIG.BOOT_SPEED)); }
  setTimeout(() => {
    document.getElementById('boot').classList.add('hidden');
    document.getElementById('desktop').classList.remove('hidden');
    initSystem();
    NerveAudio.play('boot');
    notify("NerveOS v0.7.0 Online");
  }, 400);
}

// ── WINDOW MANAGEMENT ─────────────────────────────
function initWindows() {
  document.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => { openWindow(btn.dataset.open); NerveAudio.play('click'); });
  });
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => { closeWindow(btn.dataset.close); NerveAudio.play('click'); });
  });
  document.querySelectorAll('[data-max]').forEach(btn => {
    btn.addEventListener('click', () => { toggleMaximize(btn.dataset.max); NerveAudio.play('click'); });
  });
  document.querySelectorAll('.window').forEach(win => {
    win.addEventListener('mousedown', () => bringToFront(win));
  });
  document.querySelectorAll('.win-bar').forEach(bar => {
    bar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const win = bar.closest('.window'); if (win.classList.contains('maximized')) return;
      bringToFront(win);
      const rect = win.getBoundingClientRect();
      STATE.drag = { win, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    });
    bar.addEventListener('dblclick', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      toggleMaximize(bar.closest('.window').id.replace('win-', ''));
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
    document.querySelectorAll(`[data-open="${id}"]`).forEach(el => el.classList.add('active'));
    STATE.processes.set(id, Date.now());
    if (id === 'files') renderExplorer();
    if (id === 'processes') renderProcesses();
  }
}

function closeWindow(id) {
  const win = document.getElementById(`win-${id}`);
  if (win) {
    win.classList.add('hidden');
    win.classList.remove('maximized');
    win.classList.remove('active-win');
    document.querySelectorAll(`[data-open="${id}"]`).forEach(el => el.classList.remove('active'));
    STATE.processes.delete(id);
  }
}

function toggleMaximize(id) {
  const win = document.getElementById(`win-${id}`);
  if (win) {
    win.classList.toggle('maximized');
    const btn = win.querySelector('[data-max]'); if (btn) btn.textContent = win.classList.contains('maximized') ? '❐' : '◻';
  }
}

function bringToFront(el) {
  document.querySelectorAll('.window').forEach(w => w.classList.remove('active-win'));
  el.style.zIndex = ++STATE.topZ;
  el.classList.add('active-win');
}

// ── EXPLORER ──────────────────────────────────────
function renderExplorer() {
  const grid = document.getElementById('explorer-grid'); const pathEl = document.getElementById('explorer-path');
  if (!grid || !pathEl) return;
  grid.innerHTML = ''; pathEl.textContent = STATE.explorerDir;
  if (STATE.explorerDir !== '/') {
    grid.appendChild(createExplorerItem('..', 'dir', () => {
      const parts = STATE.explorerDir.split('/').filter(p => p); parts.pop();
      STATE.explorerDir = '/' + parts.join('/'); renderExplorer();
    }));
  }
  const dir = STATE.fs[STATE.explorerDir];
  if (dir && dir.type === 'dir') {
    dir.content.forEach(name => {
      const fullPath = STATE.explorerDir === '/' ? `/${name}` : `${STATE.explorerDir}/${name}`;
      const type = STATE.fs[fullPath].type;
      grid.appendChild(createExplorerItem(name, type, () => {
        if (type === 'dir') { STATE.explorerDir = fullPath; renderExplorer(); }
        else { openWindow('notes'); document.getElementById('notes-area').value = STATE.fs[fullPath].content; notify(`Opened: ${name}`); }
        NerveAudio.play('click');
      }));
    });
  }
}

function createExplorerItem(name, type, onClick) {
  const div = document.createElement('div'); div.className = 'explorer-item';
  div.innerHTML = `<div class="explorer-icon">${type === 'dir' ? '📁' : '📄'}</div><div class="explorer-label">${name}</div>`;
  div.onclick = onClick; return div;
}

// ── PROCESS MANAGER ───────────────────────────────
function renderProcesses() {
  const list = document.getElementById('proc-list'); if (!list) return;
  list.innerHTML = '';
  STATE.processes.forEach((startTime, name) => {
    const row = document.createElement('tr');
    const uptime = Math.floor((Date.now() - startTime) / 1000) + 's';
    row.innerHTML = `<td>${name.toUpperCase()}</td><td><span class="proc-status">RUNNING</span></td><td>${uptime}</td><td><button class="proc-kill" onclick="closeWindow('${name}')">KILL</button></td>`;
    list.appendChild(row);
  });
}

// ── NOTIFICATIONS ─────────────────────────────────
function notify(msg, duration = 3000) {
  const container = document.getElementById('notif-container'); if (!container) return;
  const toast = document.createElement('div'); toast.className = 'notif-toast'; toast.textContent = msg;
  container.appendChild(toast); NerveAudio.play('notif');
  setTimeout(() => { toast.classList.add('fade-out'); toast.addEventListener('animationend', () => toast.remove()); }, duration);
}

// ── TERMINAL v3.0 ──────────────────────────────────
const COMMANDS = {
  help: () => `Available: help, status, ps, ls, cd, cat, mkdir, touch, history, theme, serial, oled, panic, lock, clear, uptime, version`,
  status: () => `MCU: ESP32-S3 | CRT: ${STATE.scanlines ? 'ON' : 'OFF'} | Secure: ARMED`,
  ps: () => Array.from(STATE.processes.keys()).map(p => `${p.padEnd(10)} RUNNING`).join('\n'),
  ls: () => STATE.fs[STATE.currentDir].content.join('  '),
  mkdir: (args) => {
    if (!args[0]) return "Usage: mkdir [directory]";
    const path = STATE.currentDir === '/' ? `/${args[0]}` : `${STATE.currentDir}/${args[0]}`;
    if (STATE.fs[path]) return "Error: Exists.";
    STATE.fs[path] = { type: 'dir', content: [] }; STATE.fs[STATE.currentDir].content.push(args[0]);
    return `Created directory: ${args[0]}`;
  },
  touch: (args) => {
    if (!args[0]) return "Usage: touch [filename]";
    const path = STATE.currentDir === '/' ? `/${args[0]}` : `${STATE.currentDir}/${args[0]}`;
    if (STATE.fs[path]) return "Error: Exists.";
    STATE.fs[path] = { type: 'file', content: 'Empty file.' }; STATE.fs[STATE.currentDir].content.push(args[0]);
    return `Created file: ${args[0]}`;
  },
  cd: (args) => {
    const target = args[0] === '..' ? '/' : (args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0]));
    if (STATE.fs[target] && STATE.fs[target].type === 'dir') { STATE.currentDir = target; return `Switched to ${target}`; }
    return `Directory not found.`;
  },
  cat: (args) => {
    const target = args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0]);
    return STATE.fs[target]?.content || `File not found.`;
  },
  history: () => STATE.termHistory.join('\n'),
  theme: (args) => { if (!args[0]) return "Usage: theme [color]"; document.documentElement.style.setProperty('--accent', args[0]); localStorage.setItem('nerve_accent', args[0]); notify(`Theme Updated`); return `Color set to ${args[0]}`; },
  serial: () => STATE.serialPort ? `Linked to Serial.` : `No link active.`,
  oled: (args) => { sendSerial(`OLED:${args.join(' ')}`); return "Sent."; },
  lock: () => { toggleLock(true); return "LOCKED."; },
  panic: () => {
    document.querySelectorAll('.window').forEach(win => win.classList.add('hidden'));
    document.querySelectorAll('.task-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('term-output').innerHTML = '';
    STATE.processes.clear(); sendSerial("SYSTEM:PANIC"); notify("PANIC PROTOCOL ACTIVATED", 5000);
    return `Panic mode engaged.`;
  },
  clear: () => { document.getElementById('term-output').innerHTML = ''; return null; },
  uptime: () => `${Math.floor((Date.now() - CONFIG.START_TIME)/1000)}s`,
  version: () => `NerveOS v0.7.0`
};

function initTerminal() {
  const input = document.getElementById('term-input'); const output = document.getElementById('term-output');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim(); input.value = ''; if (!val) return;
      STATE.termHistory.push(val); STATE.termHistoryIndex = STATE.termHistory.length;
      printHighlightedLine(val);
      const [cmd, ...args] = val.split(' ');
      if (COMMANDS[cmd]) { const res = COMMANDS[cmd](args); if (res) printLine(res, 'info'); }
      else { printLine(`Unknown: ${cmd}`, 'err'); }
    } else if (e.key === 'ArrowUp') { if (STATE.termHistoryIndex > 0) { STATE.termHistoryIndex--; input.value = STATE.termHistory[STATE.termHistoryIndex]; } e.preventDefault(); }
    else if (e.key === 'ArrowDown') { if (STATE.termHistoryIndex < STATE.termHistory.length - 1) { STATE.termHistoryIndex++; input.value = STATE.termHistory[STATE.termHistoryIndex]; } else { STATE.termHistoryIndex = STATE.termHistory.length; input.value = ''; } e.preventDefault(); }
    else if (e.key === 'Tab') { e.preventDefault(); const val = input.value.trim(); const matches = Object.keys(COMMANDS).filter(c => c.startsWith(val)); if (matches.length === 1) input.value = matches[0]; }
  });

  function printHighlightedLine(raw) {
    const parts = raw.split(" "); const cmd = parts[0]; const args = parts.slice(1);
    const div = document.createElement("div"); div.className = "t-line";
    const prompt = `<span class="t-muted">nerve@os:${STATE.currentDir}$ </span>`;
    const cmdSpan = `<span class="${COMMANDS[cmd] ? "t-cmd" : "err"}">${cmd}</span>`;
    const argsSpan = args.map(arg => ` <span class="${arg.startsWith("-") ? "t-arg" : "t-path"}">${arg}</span>`).join("");
    div.innerHTML = prompt + cmdSpan + argsSpan;
    output.appendChild(div); output.scrollTop = output.scrollHeight;
  }
    const cmdSpan = `<span class="${COMMANDS[cmd] ? 't-cmd' : 'err'}">${cmd}</span>`;
    const restSpan = rest ? ` <span class="t-arg">${rest}</span>` : '';
    div.innerHTML = prompt + cmdSpan + restSpan;
    output.appendChild(div); output.scrollTop = output.scrollHeight;
  }

  function printLine(text, cls = '') {
    const div = document.createElement('div'); div.className = `t-line ${cls}`; div.textContent = text;
    output.appendChild(div); output.scrollTop = output.scrollHeight;
  }
}

// ── HARDWARE BRIDGE ───────────────────────────────
async function sendSerial(data) {
  if (!STATE.serialWriter) return notify("Error: No hardware linked", 2000);
  const encoder = new TextEncoder(); await STATE.serialWriter.write(encoder.encode(data + "\n"));
}

async function initSerial() {
  const btn = document.getElementById('btn-connect'); const status = document.getElementById('serial-status'); if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!("serial" in navigator)) return alert("Web Serial not supported.");
    try {
      const port = await navigator.serial.requestPort(); await port.open({ baudRate: 115200 });
      STATE.serialPort = port; STATE.serialWriter = port.writable.getWriter();
      btn.textContent = "LINKED"; btn.classList.add('linked'); notify("Hardware linked");
      if (status) { status.textContent = "CONNECTED"; status.style.color = "var(--accent)"; }
    } catch (err) { if (status) { status.textContent = "LINK ERROR"; status.style.color = "var(--danger)"; } }
  });
  document.querySelectorAll('[data-macro]').forEach(btn => {
    btn.addEventListener('click', () => {
      const macro = btn.dataset.macro; if (macro === 'clear-oled') sendSerial("OLED:CLEAR"); if (macro === 'ping-hw') sendSerial("SYSTEM:PING"); if (macro === 'reboot-mcu') sendSerial("SYSTEM:REBOOT"); NerveAudio.play('click');
    });
  });
}

// ── SYSTEM UTILS ──────────────────────────────────
function initSettings() {
  const wallSelect = document.getElementById('wallpaper-select'); const desktop = document.getElementById('desktop');
  const audioToggle = document.getElementById('audio-toggle'); const scanlineToggle = document.getElementById('scanline-toggle');
  const wallpapers = { cyber1: 'url("https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop")', cyber2: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")', cyber3: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")' };
  
  const savedAccent = localStorage.getItem('nerve_accent'); if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);
  const savedWall = localStorage.getItem('nerve_wallpaper'); if (savedWall) { desktop.style.backgroundImage = wallpapers[savedWall]; if (wallSelect) wallSelect.value = savedWall; }
  
  document.querySelectorAll('.color-opt').forEach(opt => { opt.addEventListener('click', () => { const color = opt.dataset.color; document.documentElement.style.setProperty('--accent', color); localStorage.setItem('nerve_accent', color); notify("Accent Updated"); NerveAudio.play('click'); }); });
  if (wallSelect) { wallSelect.addEventListener('change', (e) => { desktop.style.backgroundImage = wallpapers[e.target.value]; localStorage.setItem('nerve_wallpaper', e.target.value); notify("Wallpaper Updated"); NerveAudio.play('click'); }); }
  
  if (audioToggle) { audioToggle.checked = STATE.audioEnabled; audioToggle.addEventListener('change', (e) => { STATE.audioEnabled = e.target.checked; notify(STATE.audioEnabled ? "Audio Enabled" : "Audio Muted"); if (STATE.audioEnabled) NerveAudio.play('click'); }); }
  if (scanlineToggle) { scanlineToggle.checked = STATE.scanlines; scanlineToggle.addEventListener('change', (e) => { STATE.scanlines = e.target.checked; document.getElementById('crt-overlay').classList.toggle('hidden', !STATE.scanlines); notify(STATE.scanlines ? "Scanlines Active" : "Scanlines Disabled"); }); }
}

function initMonitor() {
  const uptimeEl = document.getElementById('stat-uptime'); const canvas = document.getElementById('cpu-graph'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  setInterval(() => {
    STATE.uptime++; if (uptimeEl) uptimeEl.textContent = new Date(STATE.uptime * 1000).toISOString().substr(11, 8);
    STATE.cpuHistory.push(Math.random() * 50 + 10); STATE.cpuHistory.shift();
    drawGraph(ctx, STATE.cpuHistory);
    if (!document.getElementById('win-processes').classList.contains('hidden')) renderProcesses();
  }, 1000);
}

function drawGraph(ctx, data) {
  ctx.clearRect(0, 0, 300, 60); const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); const step = 300 / (data.length - 1);
  data.forEach((val, i) => { const x = i * step; const y = 60 - (val / 100 * 60); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.stroke();
}

function initShortcuts() { document.querySelectorAll('.shortcut').forEach(sc => { sc.addEventListener('click', () => { openWindow(sc.dataset.open); NerveAudio.play('click'); }); }); }
function toggleLock(locked) { STATE.locked = locked; const screen = document.getElementById('lock-screen'); screen.classList.toggle('hidden', !locked); if (locked) notify("Session Locked"); }

function initSystem() {
  initWindows(); initTerminal(); initMonitor(); initSettings(); initSerial(); initShortcuts();
  document.getElementById('btn-unlock').addEventListener('click', () => { document.getElementById('lock-screen').classList.add('hidden'); NerveAudio.play('click'); });
  openWindow('terminal');
}

runBoot();
