// ---------- GLOBALS ----------
let windows = [];          // each { id, element, title, taskBtn, minimized }
let windowZCounter = 1000;
let nextWindowId = 1;
let activeWindow = null;
let currentContextMenu = null;

// helper: notification
function notify(msg, type="info") {
  const container = document.getElementById("notifications");
  const notif = document.createElement("div");
  notif.className = "notification";
  notif.innerText = `🔔 ${msg}`;
  container.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// taskbar update
function refreshTaskbar() {
  const taskbarDiv = document.getElementById("taskbarList");
  taskbarDiv.innerHTML = "";
  windows.forEach(win => {
    const btn = document.createElement("div");
    btn.className = "task-btn";
    btn.innerText = win.title;
    btn.onclick = (e) => {
      e.stopPropagation();
      if (win.minimized) {
        win.element.style.display = "flex";
        win.minimized = false;
      }
      bringToFront(win.id);
    };
    taskbarDiv.appendChild(btn);
    win.taskBtn = btn;
  });
}

function bringToFront(winId) {
  const win = windows.find(w => w.id === winId);
  if (!win) return;
  win.element.style.zIndex = ++windowZCounter;
  win.element.classList.add("active");
  windows.forEach(w => { if(w.id !== winId) w.element.classList.remove("active"); });
  activeWindow = winId;
  if (win.minimized) {
    win.element.style.display = "flex";
    win.minimized = false;
  }
}

function closeWindow(winId) {
  const idx = windows.findIndex(w => w.id === winId);
  if(idx !== -1){
    windows[idx].element.remove();
    windows.splice(idx,1);
    refreshTaskbar();
  }
}

function minimizeWindow(winId) {
  const win = windows.find(w => w.id === winId);
  if(win) {
    win.element.style.display = "none";
    win.minimized = true;
  }
}

function maximizeWindow(winId) {
  const win = windows.find(w => w.id === winId);
  if(!win) return;
  const el = win.element;
  if (win.isMaximized) {
    el.style.width = win.prevWidth;
    el.style.height = win.prevHeight;
    el.style.top = win.prevTop;
    el.style.left = win.prevLeft;
    win.isMaximized = false;
  } else {
    win.prevWidth = el.style.width;
    win.prevHeight = el.style.height;
    win.prevTop = el.style.top;
    win.prevLeft = el.style.left;
    el.style.width = "calc(100% - 40px)";
    el.style.height = "calc(100% - 100px)";
    el.style.top = "20px";
    el.style.left = "20px";
    win.isMaximized = true;
  }
  bringToFront(winId);
}

function makeDraggableResizable(winElement, winId) {
  const header = winElement.querySelector(".window-header");
  let drag = false, startX, startY, startLeft, startTop;
  header.addEventListener("mousedown", (e) => {
    if(e.target.closest(".window-controls")) return;
    drag = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = winElement.offsetLeft;
    startTop = winElement.offsetTop;
    bringToFront(winId);
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if(!drag) return;
    let nx = startLeft + (e.clientX - startX);
    let ny = startTop + (e.clientY - startY);
    winElement.style.left = Math.max(0, Math.min(window.innerWidth - winElement.offsetWidth, nx)) + "px";
    winElement.style.top = Math.max(0, Math.min(window.innerHeight - 70, ny)) + "px";
  });
  window.addEventListener("mouseup", () => drag = false);
  // resize bottom-right corner
  const resizer = document.createElement("div");
  resizer.style.position = "absolute";
  resizer.style.bottom = "0";
  resizer.style.right = "0";
  resizer.style.width = "16px";
  resizer.style.height = "16px";
  resizer.style.cursor = "se-resize";
  resizer.style.background = "cyan";
  resizer.style.borderRadius = "0 0 8px 0";
  winElement.appendChild(resizer);
  let resizeActive = false;
  resizer.addEventListener("mousedown", (e) => {
    resizeActive = true;
    e.stopPropagation();
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if(resizeActive) {
      let newW = Math.max(280, e.clientX - winElement.offsetLeft);
      let newH = Math.max(200, e.clientY - winElement.offsetTop);
      winElement.style.width = newW + "px";
      winElement.style.height = newH + "px";
    }
  });
  window.addEventListener("mouseup", () => resizeActive = false);
}

function createWindow(title, contentHTML, width=500, height=400, left=100, top=80) {
  const winDiv = document.createElement("div");
  winDiv.className = "window";
  winDiv.style.width = width + "px";
  winDiv.style.height = height + "px";
  winDiv.style.left = left + "px";
  winDiv.style.top = top + "px";
  winDiv.style.zIndex = ++windowZCounter;
  winDiv.innerHTML = `
    <div class="window-header">
      <span>💠 ${title}</span>
      <div class="window-controls">
        <button class="win-min">─</button>
        <button class="win-max">□</button>
        <button class="win-close">✕</button>
      </div>
    </div>
    <div class="window-content"></div>
  `;
  winDiv.querySelector(".window-content").innerHTML = contentHTML;
  document.getElementById("desktopEnv").appendChild(winDiv);
  const id = nextWindowId++;
  windows.push({ id, element: winDiv, title, minimized: false, isMaximized: false });
  refreshTaskbar();
  makeDraggableResizable(winDiv, id);
  winDiv.querySelector(".win-close").onclick = () => closeWindow(id);
  winDiv.querySelector(".win-min").onclick = () => minimizeWindow(id);
  winDiv.querySelector(".win-max").onclick = () => maximizeWindow(id);
  winDiv.addEventListener("mousedown", () => bringToFront(id));
  return id;
}

// ---------- APPLICATIONS ----------
function openTerminal() {
  const content = `<div id="term-${Date.now()}" style="height:250px; overflow-y:auto; background:#000000aa; padding:6px; font-family:monospace;"><div>> NEO-OS Terminal ready. Type 'help'</div><div id="termHistory"></div><div><span>> </span><input type="text" id="termInput" style="background:transparent; border:none; color:#0f0; outline:none; width:80%;"></div></div>`;
  const winId = createWindow("TERMINAL v2.0", content, 580, 320, 120, 100);
  setTimeout(() => {
    const input = document.querySelector(`#desktopEnv .window:last-child #termInput`);
    const historyDiv = document.querySelector(`#desktopEnv .window:last-child #termHistory`);
    const commands = { help: "Available: help, about, projects, skills, clear, date, whoami", about: "NEO-OS 2077 | Cyberpunk OS", projects: "NeoDesk, QuantumNotes, NeonPlayer", skills: "JS/HTML/CSS, WebAudio, Neural UI", date: () => new Date().toString(), whoami: "neon_operator@2077" };
    const processCmd = (cmd) => {
      const c = cmd.trim().toLowerCase();
      if(c === "clear") { historyDiv.innerHTML = ""; return; }
      if(c === "date") historyDiv.innerHTML += `<div>> ${new Date()}</div>`;
      else if(commands[c]) historyDiv.innerHTML += `<div>> ${commands[c]}</div>`;
      else historyDiv.innerHTML += `<div>> Unknown: ${cmd}</div>`;
      historyDiv.scrollTop = historyDiv.scrollHeight;
    };
    input?.addEventListener("keypress", (e) => {
      if(e.key === "Enter") {
        const val = input.value;
        historyDiv.innerHTML += `<div>> ${val}</div>`;
        processCmd(val);
        input.value = "";
      }
    });
  }, 20);
}

function openNotes() {
  let notes = JSON.parse(localStorage.getItem("neon_notes") || '{"Welcome":"Hello 2077! This is your neon note.","Idea":"Create holographic UI"}');
  function saveNotes() { localStorage.setItem("neon_notes", JSON.stringify(notes)); }
  let content = `<div id="notesPanel"><select id="noteSelector"></select><button id="newNoteBtn">+ New Note</button><textarea id="noteEditor" rows="8" style="width:100%; background:#021a2a; color:cyan; margin-top:8px;"></textarea></div>`;
  const winId = createWindow("Notes OS", content, 480, 380);
  setTimeout(() => {
    const sel = document.querySelector(`#desktopEnv .window:last-child #noteSelector`);
    const editor = document.querySelector(`#desktopEnv .window:last-child #noteEditor`);
    const newBtn = document.querySelector(`#desktopEnv .window:last-child #newNoteBtn`);
    function refreshNotes() {
      sel.innerHTML = "";
      Object.keys(notes).forEach(k => { let opt = document.createElement("option"); opt.value = k; opt.innerText = k; sel.appendChild(opt); });
      if(Object.keys(notes).length) editor.value = notes[sel.value];
    }
    sel.addEventListener("change", () => { notes[sel.value] = editor.value; saveNotes(); editor.value = notes[sel.value]; });
    editor.addEventListener("input", () => { if(sel.value) notes[sel.value] = editor.value; saveNotes(); });
    newBtn.onclick = () => { let name = prompt("Note title"); if(name && !notes[name]) { notes[name] = ""; saveNotes(); refreshNotes(); sel.value = name; editor.value = notes[name]; } };
    refreshNotes();
  }, 20);
}

function openCalculator() {
  let content = `<div><input type="text" id="calcScreen" readonly style="width:100%; background:#111; color:cyan; padding:8px;"><div class="calc-buttons" id="calcGrid"></div></div>`;
  const winId = createWindow("CyberCalc", content, 320, 420);
  setTimeout(() => {
    const btns = ["7","8","9","/","4","5","6","*","1","2","3","-","0","C","=","+"];
    const grid = document.querySelector(`#desktopEnv .window:last-child #calcGrid`);
    const screen = document.querySelector(`#desktopEnv .window:last-child #calcScreen`);
    let expr = "";
    btns.forEach(b => { let div = document.createElement("div"); div.className = "calc-btn"; div.innerText = b; div.onclick = () => { if(b === "C") expr=""; else if(b === "=") { try { expr = eval(expr).toString(); } catch(e){ expr="Error"; } } else expr+=b; screen.value=expr; }; grid.appendChild(div); });
    document.addEventListener("keydown", (e) => { if(activeWindow === winId) { const key = e.key; if(/[0-9+\-*/.]/.test(key)) expr+=key; if(key === "Enter") { try { expr = eval(expr).toString(); } catch(e){ expr="Error"; } } if(key === "Escape") expr=""; screen.value=expr; } });
  }, 20);
}

function openExplorer() {
  const fs = { Projects: ["readme.txt","src.js"], Photos: ["grid.png","neon.jpg"], Documents: ["resume.pdf","notes.md"], Downloads: ["installer.exe","music.mp3"] };
  let currentFolder = "Projects";
  function render(container) {
    const files = fs[currentFolder] || [];
    container.innerHTML = `<div><strong>📁 ${currentFolder}</strong><button id="backBtn">⬅ Back</button><ul id="fileList"></ul></div>`;
    const list = container.querySelector("#fileList");
    files.forEach(f => { let li = document.createElement("li"); li.innerText = f; li.style.cursor="pointer"; li.onclick = () => { notify(`Opening ${f} (mock content)`); createWindow(`Preview: ${f}`, `<pre>CYBER-FILE: ${f}\nContent simulated.\n--- NEO-OS ---</pre>`, 400, 300); }; list.appendChild(li); });
    const back = container.querySelector("#backBtn");
    back.onclick = () => { currentFolder = "Projects"; render(container); };
  }
  const content = `<div id="explorerRoot"><div class="folder-tree" id="foldersList"></div><div id="fileView"></div></div>`;
  const winId = createWindow("File Explorer 2077", content, 600, 400);
  setTimeout(() => {
    const foldersDiv = document.querySelector(`#desktopEnv .window:last-child #foldersList`);
    const fileView = document.querySelector(`#desktopEnv .window:last-child #fileView`);
    Object.keys(fs).forEach(f => { let btn = document.createElement("button"); btn.innerText = f; btn.style.margin="4px"; btn.onclick = () => { currentFolder = f; render(fileView); }; foldersDiv.appendChild(btn); });
    render(fileView);
  }, 20);
}

function openMusicPlayer() {
  let audioCtx, source, analyser, animationId;
  const content = `<div><input type="file" id="mp3Upload" accept="audio/mpeg" multiple><div id="playlist"></div><audio id="audioPlayer" controls style="width:100%"></audio><canvas id="vizCanvas" width="400" height="100" style="width:100%; background:#000; border:1px solid cyan"></canvas><div><span id="volumeSlider">🔊 Volume: </span><input type="range" id="volRange" min="0" max="100" value="70"></div></div>`;
  const winId = createWindow("Neon Audio Player", content, 540, 480);
  setTimeout(() => {
    const audio = document.querySelector(`#desktopEnv .window:last-child #audioPlayer`);
    const playlistDiv = document.querySelector(`#desktopEnv .window:last-child #playlist`);
    const upload = document.querySelector(`#desktopEnv .window:last-child #mp3Upload`);
    const canvas = document.querySelector(`#desktopEnv .window:last-child #vizCanvas`);
    const volSlider = document.querySelector(`#desktopEnv .window:last-child #volRange`);
    let playlist = [];
    function renderPlaylist() { playlistDiv.innerHTML = playlist.map((file,idx) => `<div style="cursor:pointer; margin:4px" data-idx="${idx}">🎵 ${file.name}</div>`).join(""); document.querySelectorAll("[data-idx]").forEach(el => el.onclick = () => { audio.src = URL.createObjectURL(playlist[el.dataset.idx]); audio.play(); }); }
    upload.addEventListener("change", (e) => { playlist.push(...e.target.files); renderPlaylist(); notify("Added tracks to playlist") });
    audio.volume = 0.7;
    volSlider.oninput = () => audio.volume = volSlider.value / 100;
    // visualizer setup
    audio.addEventListener("play", () => {
      if(audioCtx) try{ audioCtx.close(); }catch(e){}
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      function draw() {
        if(!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#0ff";
        for(let i=0;i<dataArray.length/2;i++){
          let height = dataArray[i]/2;
          ctx.fillRect(i*4, canvas.height-height, 2, height);
        }
        animationId = requestAnimationFrame(draw);
      }
      draw();
    });
    audio.addEventListener("pause", () => { if(animationId) cancelAnimationFrame(animationId); });
  }, 20);
}

// --- DESKTOP LAUNCHER ---
function launchApp(app) {
  if(app === "terminal") openTerminal();
  else if(app === "notes") openNotes();
  else if(app === "calculator") openCalculator();
  else if(app === "explorer") openExplorer();
  else if(app === "music") openMusicPlayer();
  notify(`🚀 Launched ${app}`);
}

// --- RIGHT CLICK CONTEXT MENU ---
document.addEventListener("contextmenu", (e) => {
  if(e.target.closest(".desktop") || e.target === document.getElementById("desktopEnv")) {
    e.preventDefault();
    if(currentContextMenu) currentContextMenu.remove();
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.left = e.pageX + "px";
    menu.style.top = e.pageY + "px";
    menu.innerHTML = `<div id="ctxTheme">🎨 Switch Theme (Cyber-Red)</div><div id="ctxEaster">🥚 Easter Egg</div><div>🔮 System Info</div>`;
    document.body.appendChild(menu);
    currentContextMenu = menu;
    document.getElementById("ctxTheme").onclick = () => { notify("Theme: Crimson wave enabled"); document.body.style.setProperty("--neon", "magenta"); };
    document.getElementById("ctxEaster").onclick = () => { notify("✨ EASTER EGG: Konami style! particles intensify!", "secret"); const canvas = document.getElementById("cyber-bg"); canvas.style.filter = "hue-rotate(180deg)"; setTimeout(()=>canvas.style.filter="", 2000); };
    setTimeout(() => { if(menu) menu.remove(); }, 3000);
  }
});
document.addEventListener("click", () => { if(currentContextMenu) currentContextMenu.remove(); });

// CLOCK
function updateClock() {
  const d = new Date();
  document.getElementById("liveClock").innerText = d.toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateClock, 1000);

// BACKGROUND PARTICLES (cyberpunk animation)
function initBackground() {
  const canvas = document.getElementById("cyber-bg");
  const ctx = canvas.getContext("2d");
  let particles = [];
  function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  for(let i=0;i<150;i++) particles.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, vx:(Math.random()-0.5)*0.6, vy:(Math.random()-0.5)*0.3, size:Math.random()*2+1 });
  function draw() {
    if(!ctx) return;
    ctx.fillStyle = "#00000020";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.shadowBlur = 6; ctx.shadowColor = "cyan";
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; if(p.x<0) p.x=canvas.width; if(p.x>canvas.width) p.x=0; if(p.y<0) p.y=canvas.height; if(p.y>canvas.height) p.y=0; ctx.fillStyle = "#0ff"; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); });
    requestAnimationFrame(draw);
  }
  draw();
}

// BOOT & LOGIN FLOW
window.onload = () => {
  setTimeout(() => {
    document.getElementById("bootScreen").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
  }, 2600);
  document.getElementById("loginBtn").onclick = () => {
    const user = document.getElementById("loginUser").value;
    if(user.trim() !== "") {
      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("desktopEnv").style.display = "block";
      initBackground();
      notify("Welcome to NEO-OS 2077, " + user);
      // easter egg: konami code detection (simple)
      let keys = [];
      window.addEventListener("keydown", (e) => { keys.push(e.key); if(keys.slice(-4).join("") === "ArrowUpArrowUpArrowDownArrowDown") { notify("🔓 EASTER EGG: Hyper mode!", "secret"); document.body.style.filter = "drop-shadow(0 0 8px magenta)"; setTimeout(()=>document.body.style.filter="", 2000); } });
    } else { notify("Invalid login"); }
  };
  document.getElementById("startBtn").onclick = (e) => { const menu = document.getElementById("startMenu"); menu.style.display = menu.style.display === "flex" ? "none" : "flex"; e.stopPropagation(); };
  document.addEventListener("click", () => document.getElementById("startMenu").style.display = "none");
  document.querySelectorAll(".start-item[data-app]").forEach(el => el.addEventListener("click", () => launchApp(el.dataset.app)));
  document.querySelectorAll(".desktop-icon").forEach(el => el.addEventListener("dblclick", () => launchApp(el.dataset.app)));
  document.getElementById("themeSwitchEaster").onclick = () => { notify("Theme toggle: glassmorphism intensified"); document.documentElement.style.setProperty("--neon-glow", "0 0 12px magenta"); };
};

// === GPT Upgrade Pack ===
document.addEventListener('DOMContentLoaded',()=>{
 const desktop=document.querySelector('.desktop-icons');
 if(desktop){
   [
    ['browser','🌐','Browser'],
    ['dashboard','📊','Dashboard'],
    ['ai','🤖','AI'],
    ['paint','🎨','Paint']
   ].forEach(a=>{
      const d=document.createElement('div');
      d.className='desktop-icon';
      d.dataset.app=a[0];
      d.innerHTML=`<div class="icon">${a[1]}</div><div>${a[2]}</div>`;
      desktop.appendChild(d);
   });
 }
 localStorage.setItem('neoos_version','Enhanced Edition');
});
