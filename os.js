/**
 * NerveOS v0.7.0 — THE DIRECTOR'S CUT
 * Fixed logic for Macro Builder and Serial Console.
 */

const CONFIG = {
  BOOT_SPEED: 40,
  START_TIME: Date.now()
};

const MANUAL_CONTENT = `── NERVE-OS FIELD GUIDE ──

1. HARDWARE BRIDGE:
Connect your ESP32 via Serial. Configure Baud Rate in Settings.

2. TELEMETRY:
Monitor CPU and Temp in real-time. High temps trigger alerts.

3. PERSISTENCE:
Files and Macros are saved to localStorage. Use 'reset-fs' to wipe.

4. EXPORT:
Write your devlogs in Notes and export as .md for Flavortown.

SYSTEM STATUS: OPERATIONAL
VERSION: v0.7.0`;

const DEFAULT_FS = {
  '/': { type: 'dir', content: ['bin', 'usr', 'dev', 'notes', 'manual.txt', 'readme.txt'] },
  '/bin': { type: 'dir', content: ['nerve-core', 'panic-auth'] },
  '/dev': { type: 'dir', content: ['oled0', 'serial0', 'encoder0'] },
  '/notes': { type: 'dir', content: [] },
  '/manual.txt': { type: 'file', content: MANUAL_CONTENT },
  '/readme.txt': { type: 'file', content: 'NerveOS v0.7.0\nEmbedded Dev Environment Ready.' }
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

const DEFAULT_MACROS = [
  { name: 'Ping HW',      cmd: 'SYSTEM:PING' },
  { name: 'Reboot MCU',   cmd: 'SYSTEM:REBOOT' },
  { name: 'Scan WiFi',    cmd: 'SCAN:WIFI' },
  { name: 'Blink SOS',    cmd: 'LED:BLINK:SOS' },
];

// ── Persistence ──
function saveFS() { localStorage.setItem('nerve_fs', JSON.stringify(STATE.fs)); }
function saveHistory() { localStorage.setItem('nerve_history', JSON.stringify(STATE.termHistory)); }

// ── Macro Manager ──
function loadMacros() { return JSON.parse(localStorage.getItem('nerve_macros') || JSON.stringify(DEFAULT_MACROS)); }
function saveMacros(macros) { localStorage.setItem('nerve_macros', JSON.stringify(macros)); }

function renderMacros() {
  const list = document.getElementById('macro-list');
  if (!list) return;
  const macros = loadMacros();
  list.innerHTML = '';
  macros.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = 'task-btn';
    btn.style.display = 'flex';
    btn.style.justifyContent = 'space-between';
    btn.style.alignItems = 'center';
    btn.innerHTML = `<span>${m.name}</span><span style="font-size:9px; opacity:0.5; margin-left:8px;" onclick="event.stopPropagation(); deleteMacro(${i})">✕</span>`;
    btn.onclick = () => {
      sendSerial(m.cmd);
      notify(`▶ ${m.name}`);
      NerveAudio.play('click');
    };
    list.appendChild(btn);
  });
}

function addMacro() {
  const nameInput = document.getElementById('macro-name');
  const cmdInput = document.getElementById('macro-cmd');
  const name = nameInput.value.trim();
  const cmd  = cmdInput.value.trim();
  if (!name || !cmd) return notify('⚠ Preencha nome e comando');
  const macros = loadMacros();
  macros.push({ name, cmd });
  saveMacros(macros);
  nameInput.value = '';
  cmdInput.value = '';
  renderMacros();
  notify(`✓ Macro "${name}" salvo`);
  NerveAudio.play('notif');
}

function deleteMacro(i) {
  const macros = loadMacros();
  macros.splice(i, 1);
  saveMacros(macros);
  renderMacros();
  notify('Macro removido');
}

// ── Notes ──
function newNote() {
  const name = prompt('Nome do arquivo (sem .md):', 'session-' + new Date().toISOString().slice(0,10));
  if (!name) return;
  const path = `/notes/${name}.md`;
  STATE.fs[path] = { type: 'file', content: `# ${name}\n\n` };
  STATE.fs['/notes'].content.push(`${name}.md`);
  saveFS();
  STATE.activeNotePath = path;
  document.getElementById('notes-area').value = STATE.fs[path].content;
  document.getElementById('notes-filename').textContent = `${name}.md`;
  notify(`✓ ${name}.md criado`);
}

function exportNote() {
  const content = document.getElementById('notes-area')?.value || '';
  if (!content.trim()) return notify('⚠ Nota vazia');
  const filename = (STATE.activeNotePath?.split('/').pop()) || 'nerveos-notes.md';
  const blob = new Blob([content], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  notify(`↓ Exportado: ${filename}`);
  NerveAudio.play('notif');
}

// ── NerveAudio ──
const NerveAudio = {
  ctx: null,
  init() { if (this.ctx) return; this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  play(type) {
    if (!STATE.audioEnabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    if (type === 'click') { osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.05); gain.gain.setValueAtTime(0.02, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05); osc.start(); osc.stop(now + 0.05); }
    else if (type === 'notif') { osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2); osc.start(); osc.stop(now + 0.2); }
    else if (type === 'boot') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(40, now); osc.frequency.exponentialRampToValueAtTime(300, now + 0.8); gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8); osc.start(); osc.stop(now + 0.8); }
    else if (type === 'alert') { osc.type = 'triangle'; osc.frequency.setValueAtTime(800, now); osc.frequency.setValueAtTime(400, now + 0.1); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.2); osc.start(); osc.stop(now + 0.2); }
  }
};

async function runBoot() {
  try {
    const lineEl = document.getElementById('boot-line');
    document.addEventListener('mousedown', () => NerveAudio.init(), { once: true });
    if (lineEl) { for (const line of ["Initializing v0.7.0...", "Loading Dev Tools...", "System status: ABSOLUTE CINEMA", "Ready."]) { lineEl.textContent = line; await new Promise(r => setTimeout(r, CONFIG.BOOT_SPEED)); } }
    setTimeout(() => {
      document.getElementById('boot')?.classList.add('hidden');
      document.getElementById('desktop')?.classList.remove('hidden');
      initSystem();
      NerveAudio.play('boot');
      notify("NerveOS v0.7.0 — OPERATIONAL");
    }, 400);
  } catch (e) {
    document.getElementById('boot')?.classList.add('hidden');
    document.getElementById('desktop')?.classList.remove('hidden');
  }
}

function initWindows() {
  document.querySelectorAll('[data-open]').forEach(btn => { btn.addEventListener('click', () => { openWindow(btn.dataset.open); NerveAudio.play('click'); }); });
  document.querySelectorAll('[data-close]').forEach(btn => { btn.addEventListener('click', () => { closeWindow(btn.dataset.close); NerveAudio.play('click'); }); });
  document.querySelectorAll('[data-max]').forEach(btn => { btn.addEventListener('click', () => { toggleMaximize(btn.dataset.max); NerveAudio.play('click'); }); });
  document.querySelectorAll('.window').forEach(win => { win.addEventListener('mousedown', () => bringToFront(win)); });
  document.querySelectorAll('.win-bar').forEach(bar => {
    bar.addEventListener('mousedown', (e) => { if (e.target.tagName === 'BUTTON') return; const win = bar.closest('.window'); if (win.classList.contains('maximized')) return; bringToFront(win); const rect = win.getBoundingClientRect(); STATE.drag = { win, dx: e.clientX - rect.left, dy: e.clientY - rect.top }; });
    bar.addEventListener('dblclick', (e) => { if (e.target.tagName === 'BUTTON') return; toggleMaximize(bar.closest('.window').id.replace('win-', '')); });
  });
  document.addEventListener('mousemove', (e) => { if (!STATE.drag) return; STATE.drag.win.style.left = `${e.clientX - STATE.drag.dx}px`; STATE.drag.win.style.top = `${e.clientY - STATE.drag.dy}px`; });
  document.addEventListener('mouseup', () => { STATE.drag = null; });
}

function openWindow(id) {
  const win = document.getElementById(`win-${id}`);
  if (win) { win.classList.remove('hidden'); setTimeout(() => win.classList.add('win-visible'), 10); bringToFront(win); document.querySelectorAll(`[data-open="${id}"]`).forEach(el => el.classList.add('active')); STATE.processes.set(id, Date.now()); if (id === 'files') renderExplorer(); if (id === 'processes') renderProcesses(); if (id === 'macros') renderMacros(); }
}

function closeWindow(id) {
  const win = document.getElementById(`win-${id}`);
  if (win) { win.classList.remove('win-visible'); setTimeout(() => { win.classList.add('hidden'); win.classList.remove('maximized'); win.classList.remove('active-win'); }, 200); document.querySelectorAll(`[data-open="${id}"]`).forEach(el => el.classList.remove('active')); STATE.processes.delete(id); }
}

function toggleMaximize(id) { const win = document.getElementById(`win-${id}`); if (win) { win.classList.toggle('maximized'); const btn = win.querySelector('[data-max]'); if (btn) btn.textContent = win.classList.contains('maximized') ? '❐' : '◻'; } }
function bringToFront(el) { document.querySelectorAll('.window').forEach(w => w.classList.remove('active-win')); el.style.zIndex = ++STATE.topZ; el.classList.add('active-win'); }

function renderExplorer() {
  const grid = document.getElementById('explorer-grid'); const pathEl = document.getElementById('explorer-path'); if (!grid || !pathEl) return;
  grid.innerHTML = ''; pathEl.textContent = STATE.explorerDir;
  if (STATE.explorerDir !== '/') { const back = document.createElement('div'); back.className = 'explorer-item'; back.innerHTML = `<div class="explorer-icon">📁</div><div class="explorer-label">..</div>`; back.onclick = () => { const parts = STATE.explorerDir.split('/').filter(p => p); parts.pop(); STATE.explorerDir = '/' + parts.join('/'); renderExplorer(); }; grid.appendChild(back); }
  const dir = STATE.fs[STATE.explorerDir];
  if (dir && dir.type === 'dir') {
    dir.content.forEach(name => {
      const fullPath = STATE.explorerDir === '/' ? `/${name}` : `${STATE.explorerDir}/${name}`; const item = STATE.fs[fullPath]; if (!item) return;
      const div = document.createElement('div'); div.className = 'explorer-item'; div.innerHTML = `<div class="explorer-icon">${item.type === 'dir' ? '📁' : '📄'}</div><div class="explorer-label">${name}</div>`;
      div.onclick = () => { if (item.type === 'dir') { STATE.explorerDir = fullPath; renderExplorer(); } else { STATE.activeNotePath = fullPath; openWindow('notes'); document.getElementById('notes-area').value = item.content; document.getElementById('notes-filename').textContent = name; notify(`Opened: ${name}`); } NerveAudio.play('click'); };
      grid.appendChild(div);
    });
  }
}

function renderProcesses() {
  const list = document.getElementById('proc-list'); if (!list) return; list.innerHTML = '';
  STATE.processes.forEach((startTime, name) => { const row = document.createElement('tr'); const uptime = Math.floor((Date.now() - startTime) / 1000) + 's'; row.innerHTML = `<td>${name.toUpperCase()}</td><td><span class="proc-status">RUNNING</span></td><td>${uptime}</td><td><button class="proc-kill" onclick="closeWindow('${name}')">KILL</button></td>`; list.appendChild(row); });
}

function notify(msg, duration = 3000) {
  const container = document.getElementById('notif-container'); if (!container) return;
  const toast = document.createElement('div'); toast.className = 'notif-toast'; toast.textContent = msg; container.appendChild(toast); NerveAudio.play('notif');
  setTimeout(() => { toast.classList.add('fade-out'); toast.addEventListener('animationend', () => toast.remove()); }, duration);
}

const COMMANDS = {
  help: () => `Available: help, status, ps, ls, cd, cat, mkdir, touch, history, clear, uptime, reset-fs, panic, version`,
  status: () => `MCU: ESP32-S3 | CRT: ${STATE.scanlines ? 'ON' : 'OFF'} | Secure: ARMED`,
  ps: () => Array.from(STATE.processes.keys()).map(p => `${p.padEnd(10)} RUNNING`).join('\n'),
  ls: () => STATE.fs[STATE.currentDir].content.join('  '),
  mkdir: (args) => { if (!args[0]) return "Usage: mkdir [dir]"; const path = STATE.currentDir === '/' ? `/${args[0]}` : `${STATE.currentDir}/${args[0]}`; STATE.fs[path] = { type: 'dir', content: [] }; STATE.fs[STATE.currentDir].content.push(args[0]); saveFS(); return `Created ${args[0]}`; },
  touch: (args) => { if (!args[0]) return "Usage: touch [file]"; const path = STATE.currentDir === '/' ? `/${args[0]}` : `${STATE.currentDir}/${args[0]}`; STATE.fs[path] = { type: 'file', content: '' }; STATE.fs[STATE.currentDir].content.push(args[0]); saveFS(); return `Created ${args[0]}`; },
  cd: (args) => { const target = args[0] === '..' ? '/' : (args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0])); if (STATE.fs[target] && STATE.fs[target].type === 'dir') { STATE.currentDir = target; return `Switched to ${target}`; } return `Not found.`; },
  cat: (args) => { const target = args[0]?.startsWith('/') ? args[0] : (STATE.currentDir === '/' ? '/' + args[0] : STATE.currentDir + '/' + args[0]); return STATE.fs[target]?.content || `Not found.`; },
  history: () => STATE.termHistory.join('\n'),
  reset_fs: () => { localStorage.removeItem('nerve_fs'); localStorage.removeItem('nerve_history'); localStorage.removeItem('nerve_macros'); location.reload(); return "Resetting..."; },
  panic: () => { document.querySelectorAll('.window').forEach(win => closeWindow(win.id.replace('win-', ''))); sendSerial("SYSTEM:PANIC"); notify("PANIC PROTOCOL ENGAGED", 5000); return "Panic mode: ACTIVE."; },
  clear: () => { document.getElementById('term-output').innerHTML = ''; return null; },
  uptime: () => `${Math.floor((Date.now() - CONFIG.START_TIME)/1000)}s`,
  version: () => `NerveOS v0.7.0 — THE DIRECTOR'S CUT`
};

function runTermCmd(cmd) { const input = document.getElementById("term-input"); if (input) { input.value = cmd; const e = new KeyboardEvent("keydown", { key: "Enter" }); input.dispatchEvent(e); } }
function printToTerminal(text, cls = '') { const output = document.getElementById('term-output'); if (!output) return; const div = document.createElement('div'); div.className = `t-line ${cls}`; div.textContent = text; output.appendChild(div); output.scrollTop = output.scrollHeight; }

function initTerminal() {
  const input = document.getElementById('term-input'); const output = document.getElementById('term-output'); if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim(); input.value = ''; if (!val) return;
      STATE.termHistory.push(val); if (STATE.termHistory.length > 50) STATE.termHistory.shift(); STATE.termHistoryIndex = STATE.termHistory.length; saveHistory();
      printHighlightedLine(val); const [cmd, ...args] = val.split(' '); const cleanCmd = cmd.replace('-', '_');
      if (COMMANDS[cleanCmd]) { const res = COMMANDS[cleanCmd](args); if (res) printToTerminal(res, 'info'); }
      else if (STATE.serialWriter) { sendSerial(val).then(() => { printToTerminal(`→ Sent to hardware`, 'serial-out'); }); }
      else { printToTerminal(`Unknown: ${cmd} (no hardware linked)`, 'err'); }
    }
  });
  function printHighlightedLine(raw) {
    const parts = raw.split(" "); const cmd = parts[0]; const args = parts.slice(1); const div = document.createElement("div"); div.className = "t-line";
    const prompt = `<span class="t-muted">nerve@os:${STATE.currentDir}$ </span>`;
    const cmdSpan = `<span class="${COMMANDS[cmd.replace('-','_')] ? "t-cmd" : "err"}">${cmd}</span>`;
    const argsSpan = args.map(arg => ` <span class="${arg.startsWith("-") ? "t-arg" : "t-path"}">${arg}</span>`).join("");
    div.innerHTML = prompt + cmdSpan + argsSpan; output.appendChild(div); output.scrollTop = output.scrollHeight;
  }
}

function handleSerialData(raw) {
  const line = raw.trim(); if (!line) return;
  if (line.startsWith("DATA:")) {
    const parts = line.replace("DATA:", "").split("|");
    parts.forEach(p => {
      const [key, val] = p.split(":");
      if (key === "CPU") { const load = parseInt(val); STATE.cpuHistory.push(load); STATE.cpuHistory.shift(); }
      if (key === "TEMP") { const tempEl = document.getElementById("stat-status"); if (tempEl) { tempEl.textContent = val + "°C"; if (parseInt(val) > 75) { tempEl.style.color = "var(--danger)"; NerveAudio.play('alert'); } else { tempEl.style.color = "var(--accent)"; } } }
      if (key === "ENC") { const encEl = document.getElementById("stat-enc"); if (encEl) encEl.textContent = val + " rpm"; }
    });
  }
  printToTerminal(`← ${line}`, 'serial-in');
}

async function sendSerial(data) {
  if (!STATE.serialWriter) {
    if (STATE.simulatorActive) {
      printToTerminal(`→ [SIM] ${data}`, 'serial-out');
      setTimeout(() => {
        const responses = {
          'SCAN:WIFI': '← WiFi: Scanning... 3 networks found [The_Nerve_5G, Field_Unit_04]',
          'BAT:GET:VOLT': '← BATTERY: 3.82V [84%]',
          'SYSTEM:PING': '← PONG: OK',
          'SYSTEM:REBOOT': '← Rebooting Simulator Node...',
          'LED:BLINK:SOS': '← SOS: Visual Signal Transmitting'
        };
        printToTerminal(responses[data] || `← ACK:${data} | STATUS: OK`, 'serial-in');
      }, 600);
    } else {
      notify("Error: No hardware linked", 2000);
    }
    return;
  }
  const encoder = new TextEncoder(); await STATE.serialWriter.write(encoder.encode(data + "\n"));
}

async function initSerial() {
  const btn = document.getElementById('btn-connect'); const status = document.getElementById('serial-status'); if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!('serial' in navigator)) { return notify('⚠ Web Serial API requer Chrome/Edge'); }
    try {
      const port = await navigator.serial.requestPort();
      const savedBaud = localStorage.getItem('nerve_baud');
      const baud = (savedBaud && !isNaN(savedBaud)) ? parseInt(savedBaud) : 115200;
      await port.open({ baudRate: baud });
      STATE.serialPort = port; STATE.serialWriter = port.writable.getWriter();
      btn.textContent = 'LINKED'; btn.classList.add('linked'); notify('🔗 Hardware Vinculado');
      if (status) { status.textContent = 'CONNECTED'; status.style.color = 'var(--accent)'; }
      const reader = port.readable.getReader();
      let buffer = '';
      (async () => { try { while (true) { const { value, done } = await reader.read(); if (done) { reader.releaseLock(); break; } buffer += new TextDecoder().decode(value); const lines = buffer.split('\n'); buffer = lines.pop(); lines.forEach(line => handleSerialData(line)); } } catch (e) { notify('⚠ Serial desconectado'); if (status) { status.textContent = 'DISCONNECTED'; status.style.color = 'var(--danger)'; } } })();
    } catch (err) { notify('⚠ Falha: ' + err.message); if (status) { status.textContent = 'LINK ERROR'; status.style.color = 'var(--danger)'; } }
  });
}

function saveBaud(val) { localStorage.setItem('nerve_baud', val); notify(`Baud Rate: ${val}`); }

function initSettings() {
  const wallSelect = document.getElementById('wallpaper-select'); 
  const desktop = document.getElementById('desktop'); 
  const audioToggle = document.getElementById('audio-toggle'); 
  const scanlineToggle = document.getElementById('scanline-toggle'); 
  const baudSelect = document.getElementById('baud-select');
  const customWallInput = document.getElementById('custom-wallpaper-url');
  const dragDropToggle = document.getElementById('dragdrop-toggle');

  const wallpapers = { 
    cyber1: 'url("https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop")', 
    cyber2: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")', 
    cyber3: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop")', 
    cinema1: 'url("https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop")', 
    cinema2: 'url("https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop")' 
  };

  const savedAccent = localStorage.getItem('nerve_accent'); 
  if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);
  
  const savedWall = localStorage.getItem('nerve_wallpaper'); 
  const customWallUrl = localStorage.getItem('nerve_custom_wallpaper');
  const dragDropEnabled = localStorage.getItem('nerve_dragdrop') !== 'false';

  if (dragDropToggle) dragDropToggle.checked = dragDropEnabled;

  if (savedWall === 'custom' && customWallUrl) {
    desktop.style.backgroundImage = `url("${customWallUrl}")`;
    if (wallSelect) wallSelect.value = 'custom';
    if (customWallInput) { customWallInput.classList.remove('hidden'); customWallInput.value = customWallUrl; }
  } else if (savedWall && wallpapers[savedWall]) { 
    desktop.style.backgroundImage = wallpapers[savedWall]; 
    if (wallSelect) wallSelect.value = savedWall; 
  }

  const savedBaud = localStorage.getItem('nerve_baud') || '115200'; 
  if (baudSelect) baudSelect.value = savedBaud;

  if (dragDropToggle) {
    dragDropToggle.addEventListener('change', (e) => {
      localStorage.setItem('nerve_dragdrop', e.target.checked);
      notify(e.target.checked ? "Drag & Drop Enabled" : "Drag & Drop Locked");
      NerveAudio.play('click');
    });
  }

  document.querySelectorAll('.color-opt').forEach(opt => { 
    opt.addEventListener('click', () => { 
      const color = opt.dataset.color; 
      document.documentElement.style.setProperty('--accent', color); 
      localStorage.setItem('nerve_accent', color); 
      notify(`Theme Updated: ${color}`); 
      NerveAudio.play('click'); 
    }); 
  });

  if (wallSelect) { 
    wallSelect.addEventListener('change', (e) => { 
      const wall = e.target.value; 
      if (wall === 'custom') {
        customWallInput?.classList.remove('hidden');
      } else {
        customWallInput?.classList.add('hidden');
        if (wallpapers[wall]) { 
          desktop.style.backgroundImage = wallpapers[wall]; 
          localStorage.setItem('nerve_wallpaper', wall); 
          notify("Interface Visual Updated"); 
          NerveAudio.play('click'); 
        } 
      }
    }); 
  }

  if (customWallInput) {
    customWallInput.placeholder = "Paste URL or Ctrl+V image file...";
    customWallInput.addEventListener('change', (e) => {
      const url = e.target.value.trim();
      if (url) {
        desktop.style.backgroundImage = `url("${url}")`;
        localStorage.setItem('nerve_wallpaper', 'custom');
        localStorage.setItem('nerve_custom_wallpaper', url);
        notify("Custom Wallpaper Applied");
        NerveAudio.play('click');
      }
    });

    // Paste Image Handler (Specific to the Input field)
    customWallInput.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target.result;
            desktop.style.backgroundImage = `url("${dataUrl}")`;
            localStorage.setItem('nerve_wallpaper', 'custom');
            localStorage.setItem('nerve_custom_wallpaper', dataUrl);
            customWallInput.value = "Image from Clipboard";
            notify("Wallpaper Updated via Clipboard");
            NerveAudio.play('notif');
          };
          reader.readAsDataURL(blob);
        }
      }
    });
  }

  // ── Drag & Drop Wallpaper (Modern UX) ──
  desktop.addEventListener('dragover', (e) => {
    if (localStorage.getItem('nerve_dragdrop') === 'false') return;
    e.preventDefault();
    desktop.classList.add('drag-over');
  });
  desktop.addEventListener('dragleave', () => desktop.classList.remove('drag-over'));
  desktop.addEventListener('drop', (e) => {
    if (localStorage.getItem('nerve_dragdrop') === 'false') return;
    e.preventDefault();
    desktop.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        desktop.style.backgroundImage = `url("${dataUrl}")`;
        localStorage.setItem('nerve_wallpaper', 'custom');
        localStorage.setItem('nerve_custom_wallpaper', dataUrl);
        if (wallSelect) wallSelect.value = 'custom';
        if (customWallInput) { customWallInput.classList.remove('hidden'); customWallInput.value = "Image from File"; }
        notify("Wallpaper Updated via Drop");
        NerveAudio.play('notif');
      };
      reader.readAsDataURL(file);
    }
  });

  if (audioToggle) { 
    audioToggle.checked = STATE.audioEnabled; 
    audioToggle.addEventListener('change', (e) => { 
      STATE.audioEnabled = e.target.checked; 
      notify(STATE.audioEnabled ? "Audio Feed: ON" : "Audio Feed: MUTED"); 
      if (STATE.audioEnabled) NerveAudio.play('click'); 
    }); 
  }
  if (scanlineToggle) { 
    scanlineToggle.checked = STATE.scanlines; 
    scanlineToggle.addEventListener('change', (e) => { 
      STATE.scanlines = e.target.checked; 
      const overlay = document.getElementById('crt-overlay'); 
      if (overlay) overlay.style.display = STATE.scanlines ? 'block' : 'none'; 
      notify(STATE.scanlines ? "CRT Emulation: ACTIVE" : "CRT Emulation: OFF"); 
    }); 
  }
}

function initMonitor() {
  const uptimeEl = document.getElementById('stat-uptime'); const canvas = document.getElementById('cpu-graph');
  setInterval(() => {
    STATE.uptime++; if (uptimeEl) uptimeEl.textContent = new Date(STATE.uptime * 1000).toISOString().substr(11, 8);
    if (!STATE.serialPort) { STATE.cpuHistory.push(Math.random() * 20 + 5); STATE.cpuHistory.shift(); }
    if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 300, 60); ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent'); ctx.lineWidth = 2; ctx.beginPath(); const step = 300 / (STATE.cpuHistory.length - 1); STATE.cpuHistory.forEach((v, i) => { const x = i * step; const y = 60 - (v / 100 * 60); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }); ctx.stroke(); }
    if (document.getElementById('win-processes') && !document.getElementById('win-processes').classList.contains('hidden')) renderProcesses();
  }, 1000);
}

function initNotes() { const area = document.getElementById('notes-area'); if (area) { area.addEventListener('input', () => { if (STATE.activeNotePath && STATE.fs[STATE.activeNotePath]) { STATE.fs[STATE.activeNotePath].content = area.value; saveFS(); } }); } }
function initShortcuts() { document.querySelectorAll('.shortcut').forEach(sc => { sc.addEventListener('click', () => { openWindow(sc.dataset.open); NerveAudio.play('click'); }); }); }

// ── Neural Flash IDE (Simulator) ──
let IDE_BOARD = 'ESP32-S3';

function ideSelectBoard(board) {
  IDE_BOARD = board;
  document.getElementById('step-1').classList.add('hidden');
  document.getElementById('step-2').classList.remove('hidden');
  NerveAudio.play('click');
}

async function ideLinkPhysical() {
  if (!("serial" in navigator)) return alert("Web Serial API required.");
  try {
    const port = await navigator.serial.requestPort();
    // Real verification: try to open the port to ensure it's functional
    await port.open({ baudRate: 115200 });
    await port.close(); 
    ideStartFlash();
  } catch (err) {
    notify("⚠ Hardware link failed. Connect a device.");
  }
}

function ideStartFlash() {
  document.getElementById('step-2').classList.add('hidden');
  document.getElementById('step-3').classList.remove('hidden');
  const console = document.getElementById('ide-console');
  const bar = document.getElementById('flash-bar');
  
  const logs = [
    `> Initializing compiler for \${IDE_BOARD}...`,
    `> Parsing firmware.ino...`,
    `> Memory usage: 282527 bytes (21% of flash)`,
    `> Connecting to Neural Bridge...`,
    `> Erasing flash blocks...`,
    `> Writing at 0x00010000... (10%)`,
    `> Writing at 0x00020000... (45%)`,
    `> Writing at 0x00050000... (82%)`,
    `> Writing at 0x00080000... (100%)`,
    `> Verified. Booting...`
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i < logs.length) {
      const line = document.createElement('div');
      line.textContent = logs[i];
      console.appendChild(line);
      console.scrollTop = console.scrollHeight;
      bar.style.width = ((i+1) / logs.length * 100) + '%';
      NerveAudio.play('click');
      i++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        document.getElementById('step-3').classList.add('hidden');
        document.getElementById('step-success').classList.remove('hidden');
        activateSimulatorMode();
      }, 800);
    }
  }, 400);
}

function activateSimulatorMode() {
  STATE.simulatorActive = true;
  const status = document.getElementById('serial-status');
  if (status) { 
    status.textContent = "SIMULATED (" + IDE_BOARD + ")"; 
    status.style.color = "var(--accent)"; 
  }
  notify("Simulator Mode: ONLINE");
  NerveAudio.play('boot');
  
  // Start high-quality mock telemetry
  setInterval(() => {
    if (STATE.simulatorActive) {
      const cpu = Math.floor(Math.random() * 15 + 10);
      const temp = Math.floor(Math.random() * 5 + 38);
      const enc = Math.floor(Math.random() * 120 + 20);
      handleSerialData(`DATA:CPU:${cpu}|TEMP:${temp}|ENC:${enc}`);
    }
  }, 2000);
}

function initSystem() {
  initWindows(); initTerminal(); initMonitor(); initSettings(); initSerial(); initNotes(); initShortcuts(); renderMacros();
  document.querySelector('[data-open="macros"]')?.addEventListener('click', renderMacros);
  
  // ── Authentication System (v0.7.3) ──
  const lockScreen = document.getElementById('lock-screen');
  const lockBox = lockScreen.querySelector('.lock-box');
  const lockInput = document.getElementById('lock-input');
  const lockUser = document.getElementById('lock-user');
  const lockHint = document.getElementById('lock-hint');
  const unlockBtn = document.getElementById('btn-unlock');

  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const now = new Date();
  const currentDay = days[now.getDay()];
  const currentPass = (now.getMonth()+1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0') + now.getFullYear();

  // ── Dynamic Login Wallpaper (v0.7.3) ──
  const dayWallpaperMap = {
    "MONDAY": "wallpapers/monday.png",
    "TUESDAY": "wallpapers/tuesday.png",
    "WEDNESDAY": "wallpapers/wednesday.png",
    "THURSDAY": "wallpapers/thursday.png",
    "FRIDAY": "wallpapers/friday.png",
    "SATURDAY": "wallpapers/saturday.png",
    "SUNDAY": "wallpapers/sunday.png"
  };
  const dailyWall = dayWallpaperMap[currentDay];
  // Set background if the file exists (using a fallback)
  lockScreen.style.backgroundImage = `url('${dailyWall}'), url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')`;

  lockUser.textContent = `USER: ${currentDay}_DIRECTOR`;
  lockHint.textContent = `HINT: ${currentDay} | MMDDYYYY`;

  function attemptUnlock() {
    if (lockInput.value === currentPass) {
      lockScreen.classList.add('hidden');
      NerveAudio.play('boot');
      notify("Authentication Successful");
      openWindow('terminal');
    } else {
      lockBox.classList.add('shake');
      NerveAudio.play('alert');
      lockInput.value = '';
      setTimeout(() => lockBox.classList.remove('shake'), 400);
      notify("ACCESS DENIED", 2000);
    }
  }

  unlockBtn.addEventListener('click', attemptUnlock);
  lockInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptUnlock(); });
}

runBoot();
