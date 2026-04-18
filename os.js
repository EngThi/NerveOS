/**
 * NerveOS v0.6.3 - Visual Polish & Syntax
 */

const CONFIG = {
  BOOT_SPEED: 80,
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
  cpuHistory: new Array(30).fill(0),
  processes: new Map(),
  fs: {
    '/': { type: 'dir', content: ['bin', 'usr', 'dev', 'readme.txt'] },
    '/bin': { type: 'dir', content: ['nerve-core', 'panic-auth'] },
    '/dev': { type: 'dir', content: ['oled0', 'serial0', 'encoder0'] },
    '/readme.txt': { type: 'file', content: 'NerveOS v0.6.3\nAbsolute Cinema Aesthetic: ACTIVE.' }
  },
  currentDir: '/',
  explorerDir: '/'
};

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

const BOOT_LINES = [
  "NerveOS v0.6.3 initializing...",
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
      const bootScreen = document.getElementById('boot');
      const desktop = document.getElementById('desktop');
      if (bootScreen) bootScreen.classList.add('hidden');
      if (desktop) desktop.classList.remove('hidden');
      
      initSystem();
      NerveAudio.play('boot');
      notify("NerveOS v0.6.3 Online");
    }, 400);
  } catch (e) {
    console.error("Boot error:", e);
    // Force show desktop if boot fails
    const bootScreen = document.getElementById('boot');
    if (bootScreen) bootScreen.classList.add('hidden');
    const desktop = document.getElementById('desktop');
    if (desktop) desktop.classList.remove('hidden');
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
        else { openWindow('notes'); document.getElementById('notes-area').value = item.content; notify(`Opened: ${name}`); }
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
  help: () => `Available: help, status, ps, ls, cd, cat, mkdir, touch, history, clear, uptime`,
  status: () => `MCU: ESP32-S3 | CRT: ${STATE.scanlines ? 'ON' : 'OFF'}`,
  ps: () => Array.from(STATE.processes.keys()).map(p => `${p.padEnd(10)} RUNNING`).join('\n'),
  ls: () => STATE.fs[STATE.currentDir].content.join('  '),
  mkdir: (args) => {
    if (!args[0]) return "Usage: mkdir [dir]";
    const path = STATE.currentDir === '/' ? `/${args[0]}` : `${STATE.currentDir}/${args[0]}`;
    STATE.fs[path] = { type: 'dir', content: [] }; STATE.fs[STATE.currentDir].content.push(args[0]);
    return `Created ${args[0]}`;
  },
  touch: (args) => {
    if (!args[0]) return "Usage: touch [file]";
    const path = STATE.currentDir === '/' ? `/${args[0]}` : `${STATE.currentDir}/${args[0]}`;
    STATE.fs[path] = { type: 'file', content: '' }; STATE.fs[STATE.currentDir].content.push(args[0]);
    return `Created ${args[0]}`;
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
  clear: () => { document.getElementById('term-output').innerHTML = ''; return null; },
  uptime: () => `${Math.floor((Date.now() - CONFIG.START_TIME)/1000)}s`
};

function runTermCmd(cmd) {
  const input = document.getElementById("term-input");
  if (input) {
    input.value = cmd;
    const e = new KeyboardEvent("keydown", { key: "Enter" });
    input.dispatchEvent(e);
  }
}

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
    }
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

  function printLine(text, cls = '') {
    const div = document.createElement('div'); div.className = `t-line ${cls}`; div.textContent = text;
    output.appendChild(div); output.scrollTop = output.scrollHeight;
  }
}

function initMonitor() {
  const uptimeEl = document.getElementById('stat-uptime');
  const canvas = document.getElementById('cpu-graph');
  setInterval(() => {
    STATE.uptime++; if (uptimeEl) uptimeEl.textContent = new Date(STATE.uptime * 1000).toISOString().substr(11, 8);
    STATE.cpuHistory.push(Math.random() * 50 + 10); STATE.cpuHistory.shift();
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 300, 60); ctx.strokeStyle = '#00ffb4'; ctx.lineWidth = 2; ctx.beginPath();
      const step = 300 / (STATE.cpuHistory.length - 1);
      STATE.cpuHistory.forEach((v, i) => { const x = i * step; const y = 60 - (v / 100 * 60); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();
    }
    if (document.getElementById('win-processes') && !document.getElementById('win-processes').classList.contains('hidden')) renderProcesses();
  }, 1000);
}

function initSystem() {
  initWindows(); initTerminal(); initMonitor();
  const unlockBtn = document.getElementById('btn-unlock');
  if (unlockBtn) unlockBtn.addEventListener('click', () => { document.getElementById('lock-screen').classList.add('hidden'); NerveAudio.play('click'); });
  openWindow('terminal');
}

runBoot();
