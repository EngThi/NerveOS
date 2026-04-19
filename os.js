/**
 * NerveOS v0.6.6 - Persistence & Macro Manager
 */

const CONFIG = {
  BOOT_SPEED: 60,
  START_TIME: Date.now()
};

const DEFAULT_FS = {
  '/': { type: 'dir', content: ['bin', 'usr', 'dev', 'notes', 'readme.txt'] },
  '/bin': { type: 'dir', content: ['nerve-core', 'panic-auth'] },
  '/dev': { type: 'dir', content: ['oled0', 'serial0', 'encoder0'] },
  '/notes': { type: 'dir', content: [] },
  '/readme.txt': { type: 'file', content: 'NerveOS v0.6.6\nPersistence: ENABLED\nMacro Manager: ONLINE.' }
};

const STATE = {
  topZ: 100,
  drag: null,
  uptime: 0,
  serialPort: null,
  serialWriter: null,
  termHistory: JSON.parse(localStorage.getItem('nerve_history') || '[]'),
  termHistoryIndex: -1,
  audioEnabled: true,
  scanlines: true,
  cpuHistory: new Array(30).fill(0),
  processes: new Map(),
  fs: JSON.parse(localStorage.getItem('nerve_fs')) || DEFAULT_FS,
  currentDir: '/',
  explorerDir: '/',
  activeNotePath: null
};

// ── Persistence ──
function saveFS() { localStorage.setItem('nerve_fs', JSON.stringify(STATE.fs)); }
function saveHistory() { localStorage.setItem('nerve_history', JSON.stringify(STATE.termHistory)); }

const NerveAudio = {
  ctx: null,
  init() { if (this.ctx) return; this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  play(type) {
    if (!STATE.audioEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    if (type === 'click') { osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.05); gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05); osc.start(); osc.stop(now + 0.05); }
    else if (type === 'notif') { osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(); osc.stop(now + 0.2); }
    else if (type === 'boot') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(50, now); osc.frequency.exponentialRampToValueAtTime(400, now + 1); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 1); osc.start(); osc.stop(now + 1); }
    else if (type === 'alert') { osc.type = 'triangle'; osc.frequency.setValueAtTime(1000, now); osc.frequency.setValueAtTime(500, now + 0.1); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.2); osc.start(); osc.stop(now + 0.2); }
  }
};

const BOOT_LINES = [
  "NerveOS v0.6.6 initializing...",
  "Loading persistent storage...",
  "Calibrating scanline generators...",
  "System status: ABSOLUTE CINEMA",
  "Ready."
];

async function runBoot() {
  try {
    const lineEl = document.getElementById('boot-line');
    document.addEventListener('mousedown', () => NerveAudio.init(), { once: true });
    if (lineEl) {
      for (const line of BOOT_LINES) { lineEl.textContent = line; await new Promise(r => setTimeout(r, CONFIG.BOOT_SPEED)); }
    }
    setTimeout(() => {
      document.getElementById('boot')?.classList.add('hidden');
      document.getElementById('desktop')?.classList.remove('hidden');
      initSystem();
      NerveAudio.play('boot');
      notify("NerveOS v0.6.6 Online");
    }, 400);
  } catch (e) {
    document.getElementById('boot')?.classList.add('hidden');
    document.getElementById('desktop')?.classList.remove('hidden');
  }
}

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

function renderExplorer() {
  const grid = document.getElementById('explorer-grid'); const pathEl = document.getElementById('explorer-path');
  if (!grid || !pathEl) return;
  grid.innerHTML = ''; pathEl.textContent = STATE.explorerDir;
  if (STATE.explorerDir !== '/') {
    const back = document.createElement('div'); back.className = 'explorer-item';
    back.innerHTML = `<div class="explorer-icon">📁</div><div class="explorer-label">..</div>`;
    back.onclick = () => {
      const parts = STATE.explorerDir.split('/').filter(p => p); parts.pop();
      STATE.explorerDir = '/' + parts.join('/'); renderExplorer();
    };
    grid.appendChild(back);
  }
  const dir = STATE.fs[STATE.explorerDir];
  if (dir && dir.type === 'dir') {
    dir.content.forEach(name => {
      const fullPath = STATE.explorerDir === '/' ? `/${name}` : `${STATE.explorerDir}/${name}`;
      const item = STATE.fs[fullPath];
      if (!item) return;
      const div = document.createElement('div'); div.className = 'explorer-item';
      div.innerHTML = `<div class="explorer-icon">${item.type === 'dir' ? '📁' : '📄'}</div><div class="explorer-label">${name}</div>`;
      div.onclick = () => {
        if (item.type === 'dir') { STATE.explorerDir = fullPath; renderExplorer(); }
        else { 
          STATE.activeNotePath = fullPath;
          openWindow('notes'); 
          document.getElementById('notes-area').value = item.content; 
          notify(`Opened: ${name}`); 
        }
        NerveAudio.play('click');
      };
      grid.appendChild(div);
    });
  }
}

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

function notify(msg, duration = 3000) {
  const container = document.getElementById('notif-container'); if (!container) return;
  const toast = document.createElement('div'); toast.className = 'notif-toast'; toast.textContent = msg;
  container.appendChild(toast); NerveAudio.play('notif');
  setTimeout(() => { toast.classList.add('fade-out'); toast.addEventListener('animationend', () => toast.remove()); }, duration);
}

const COMMANDS = {
  help: () => `Available: help, status, ps, ls, cd, cat, mkdir, touch, history, clear, uptime, reset-fs`,
  status: () => `MCU: ESP32-S3 | CRT: ${STATE.scanlines ? 'ON' : 'OFF'}`,
  ps: () => Array.from(STATE.processes.keys()).map(p => `${p.padEnd(10)} RUNNING`).join('\n'),
  ls: () => STATE.fs[STATE.currentDir].content.join('  '),
  mkdir: (args) => {
    if (!args[0]) return "Usage: mkdir [dir]";
    const path = STATE.currentDir === '/' ? `/${args[0]}` : `${STATE.currentDir}/${args[0]}`;
    STATE.fs[path] = { type: 'dir', content: [] }; 
    STATE.fs[STATE.currentDir].content.push(args[0]);
    saveFS(); return `Created ${args[0]}`;
  },
  touch: (args) => {
    if (!args[0]) return "Usage: touch [file]";
    const path = STATE.currentDir === '/' ? `/${args[0]}` : `${STATE.currentDir}/${args[0]}`;
    STATE.fs[path] = { type: 'file', content: '' }; 
    STATE.fs[STATE.currentDir].content.push(args[0]);
    saveFS(); return `Created ${args[0]}`;
  },
  cd: (args) => {
    const target = args[0] === '..' ? '/' : (args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0]));
    if (STATE.fs[target] && STATE.fs[target].type === 'dir') { STATE.currentDir = target; return `Switched to ${target}`; }
    return `Not found.`;
  },
  cat: (args) => {
    const target = args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0]);
    return STATE.fs[target]?.content || `Not found.`;
  },
  history: () => STATE.termHistory.join('\n'),
  reset_fs: () => { localStorage.removeItem('nerve_fs'); location.reload(); return "Resetting..."; },
  clear: () => { document.getElementById('term-output').innerHTML = ''; return null; },
  uptime: () => `${Math.floor((Date.now() - CONFIG.START_TIME)/1000)}s`
};

function runTermCmd(cmd) {
  const input = document.getElementById("term-input");
  if (input) { input.value = cmd; const e = new KeyboardEvent("keydown", { key: "Enter" }); input.dispatchEvent(e); }
}

function initTerminal() {
  const input = document.getElementById('term-input'); const output = document.getElementById('term-output');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim(); input.value = ''; if (!val) return;
      STATE.termHistory.push(val); if (STATE.termHistory.length > 50) STATE.termHistory.shift();
      STATE.termHistoryIndex = STATE.termHistory.length;
      saveHistory();
      printHighlightedLine(val);
      const [cmd, ...args] = val.split(' ');
      const cleanCmd = cmd.replace('-', '_');
      if (COMMANDS[cleanCmd]) { const res = COMMANDS[cleanCmd](args); if (res) printLine(res, 'info'); }
      else { printLine(`Unknown: ${cmd}`, 'err'); }
    }
  });

  function printHighlightedLine(raw) {
    const parts = raw.split(" "); const cmd = parts[0]; const args = parts.slice(1);
    const div = document.createElement("div"); div.className = "t-line";
    const prompt = `<span class="t-muted">nerve@os:${STATE.currentDir}$ </span>`;
    const cmdSpan = `<span class="${COMMANDS[cmd.replace('-','_')] ? "t-cmd" : "err"}">${cmd}</span>`;
    const argsSpan = args.map(arg => ` <span class="${arg.startsWith("-") ? "t-arg" : "t-path"}">${arg}</span>`).join("");
    div.innerHTML = prompt + cmdSpan + argsSpan;
    output.appendChild(div); output.scrollTop = output.scrollHeight;
  }

  function printLine(text, cls = '') {
    const div = document.createElement('div'); div.className = `t-line ${cls}`; div.textContent = text;
    output.appendChild(div); output.scrollTop = output.scrollHeight;
  }
}

function handleSerialData(raw) {
  const line = raw.trim();
  if (line.startsWith("DATA:")) {
    const parts = line.replace("DATA:", "").split("|");
    parts.forEach(p => {
      const [key, val] = p.split(":");
      if (key === "CPU") { const load = parseInt(val); STATE.cpuHistory.push(load); STATE.cpuHistory.shift(); }
      if (key === "TEMP") {
        const tempEl = document.getElementById("stat-status");
        if (tempEl) {
          tempEl.textContent = val + "°C";
          if (parseInt(val) > 75) { tempEl.style.color = "var(--danger)"; NerveAudio.play('alert'); }
          else { tempEl.style.color = "var(--accent)"; }
        }
      }
      if (key === "ENC") { const encEl = document.getElementById("stat-enc"); if (encEl) encEl.textContent = val + " rpm"; }
    });
  }
}

async function sendSerial(data) {
  if (!STATE.serialWriter) return notify("Error: No hardware linked", 2000);
  const encoder = new TextEncoder(); await STATE.serialWriter.write(encoder.encode(data + "\n"));
}

async function initSerial() {
  const btn = document.getElementById('btn-connect'); const status = document.getElementById('serial-status'); if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!("serial" in navigator)) return alert("Web Serial API support required.");
    try {
      const port = await navigator.serial.requestPort(); await port.open({ baudRate: 115200 });
      STATE.serialPort = port; STATE.serialWriter = port.writable.getWriter();
      btn.textContent = "LINKED"; btn.classList.add('linked'); notify("Hardware linked");
      if (status) { status.textContent = "CONNECTED"; status.style.color = "var(--accent)"; }
      const reader = port.readable.getReader();
      while (true) { const { value, done } = await reader.read(); if (done) { reader.releaseLock(); break; } handleSerialData(new TextDecoder().decode(value)); }
    } catch (err) { if (status) { status.textContent = "LINK ERROR"; status.style.color = "var(--danger)"; } }
  });
}

function initSettings() {
  const wallSelect = document.getElementById('wallpaper-select'); const desktop = document.getElementById('desktop');
  const audioToggle = document.getElementById('audio-toggle'); const scanlineToggle = document.getElementById('scanline-toggle');
  const wallpapers = {
    cyber1: 'url("https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop")',
    cyber2: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
    cyber3: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")',
    cinema1: 'url("https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop")',
    cinema2: 'url("https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop")'
  };
  const savedAccent = localStorage.getItem('nerve_accent'); if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);
  const savedWall = localStorage.getItem('nerve_wallpaper'); if (savedWall && wallpapers[savedWall]) { desktop.style.backgroundImage = wallpapers[savedWall]; if (wallSelect) wallSelect.value = savedWall; }
  document.querySelectorAll('.color-opt').forEach(opt => { opt.addEventListener('click', () => { const color = opt.dataset.color; document.documentElement.style.setProperty('--accent', color); localStorage.setItem('nerve_accent', color); notify(`Theme Updated: ${color}`); NerveAudio.play('click'); }); });
  if (wallSelect) { wallSelect.addEventListener('change', (e) => { const wall = e.target.value; if (wallpapers[wall]) { desktop.style.backgroundImage = wallpapers[wall]; localStorage.setItem('nerve_wallpaper', wall); notify("Interface Visual Updated"); NerveAudio.play('click'); } }); }
  if (audioToggle) { audioToggle.checked = STATE.audioEnabled; audioToggle.addEventListener('change', (e) => { STATE.audioEnabled = e.target.checked; notify(STATE.audioEnabled ? "Audio Feed: ON" : "Audio Feed: MUTED"); if (STATE.audioEnabled) NerveAudio.play('click'); }); }
  if (scanlineToggle) { scanlineToggle.checked = STATE.scanlines; scanlineToggle.addEventListener('change', (e) => { STATE.scanlines = e.target.checked; const overlay = document.getElementById('crt-overlay'); if (overlay) overlay.style.display = STATE.scanlines ? 'block' : 'none'; notify(STATE.scanlines ? "CRT Emulation: ACTIVE" : "CRT Emulation: OFF"); }); }
}

function initMonitor() {
  const uptimeEl = document.getElementById('stat-uptime'); const canvas = document.getElementById('cpu-graph');
  setInterval(() => {
    STATE.uptime++; if (uptimeEl) uptimeEl.textContent = new Date(STATE.uptime * 1000).toISOString().substr(11, 8);
    if (!STATE.serialPort) { STATE.cpuHistory.push(Math.random() * 20 + 5); STATE.cpuHistory.shift(); }
    if (canvas) {
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 300, 60); ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent'); ctx.lineWidth = 2; ctx.beginPath();
      const step = 300 / (STATE.cpuHistory.length - 1); STATE.cpuHistory.forEach((v, i) => { const x = i * step; const y = 60 - (v / 100 * 60); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }); ctx.stroke();
    }
    if (document.getElementById('win-processes') && !document.getElementById('win-processes').classList.contains('hidden')) renderProcesses();
  }, 1000);
}

function initNotes() {
  const area = document.getElementById('notes-area');
  if (area) {
    area.addEventListener('input', () => {
      if (STATE.activeNotePath && STATE.fs[STATE.activeNotePath]) {
        STATE.fs[STATE.activeNotePath].content = area.value;
        saveFS();
      }
    });
  }
}

function initSystem() {
  initWindows(); initTerminal(); initMonitor(); initSettings(); initSerial(); initNotes();
  const unlockBtn = document.getElementById('btn-unlock');
  if (unlockBtn) unlockBtn.addEventListener('click', () => { document.getElementById('lock-screen').classList.add('hidden'); NerveAudio.play('click'); });
  openWindow('terminal');
}

runBoot();
