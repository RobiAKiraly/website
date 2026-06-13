/**
 * ⚡ NEO-OS 2077 | SYSTEM EMULATION ENGINE Core v3.0
 * Pure Native JS - No Framework Dependencies
 */

// ---------- CONFIG & VARIABLES ----------
let costica_srl=0;
let windows = [];
let windowZCounter = 1000;
let nextWindowId = 1;
let activeWindow = null;
let currentContextMenu = null;

// Persistent Settings Structure
let sysConfig = {
  wallpaper: 'cyber_grid',
  glassOpacity: '0.85',
  particleCount: 120,
  particleSpeed: 0.6,
  bootScreenEnabled: true,
  dndMode: false,
  theme: 'neon'
};

// Global Notification Log
let notificationHistory = [];

// Screen Inactivity Variable
let lastInputTime = Date.now();
let screensaverActive = false;
let screensaverLoopId = null;

// Desktop Click Tracker (Easter Egg Credits)
let desktopClickCount = 0;
let desktopClickTimer = null;

// Real Nested File System Map Initialization
let virtualFS = {
  root: {
    type: 'folder',
    name: 'root',
    children: {
      'Projects': {
        type: 'folder', name: 'Projects', children: {
          'kernel_hack.txt': { type: 'file', name: 'kernel_hack.txt', content: '// Sudo access script over Neural-Link\nconsole.log("OS Hijacked successfully.");' },
          'ui_styles.css': { type: 'file', name: 'ui_styles.css', content: ':root {\n  --neon: #0ff;\n}' }
        }
      },
      'Music': {
        type: 'folder', name: 'Music', children: {}
      },
      'Recycle Bin': {
        type: 'folder', name: 'Recycle Bin', children: {}
      }
    }
  }
};

// Application Map Registry for Dynamic Associations
const APP_REGISTRY = {
  terminal: { name: "Terminal", icon: "🖥️", runner: () => openTerminal() },
  notes: { name: "QuantumNotes", icon: "📝", runner: () => openNotes() },
  calculator: { name: "CyberCalc", icon: "🧮", runner: () => openCalculator() },
  explorer: { name: "File Explorer", icon: "📁", runner: () => openExplorer() },
  music: { name: "Neon Player", icon: "🎵", runner: () => openMusicPlayer() },
  settings: { name: "System Settings", icon: "⚙️", runner: () => openSettingsPanel() },
  taskmanager: { name: "Task Manager", icon: "📊", runner: () => openTaskManager() },
  editor: { name: "Advanced Text Editor", icon: "📝", runner: (filePath) => openAdvancedEditor(filePath) },
  snake: { name: "Grid Snake Game", icon: "🐍", runner: () => launchSnakeGame() }
};

// Custom User Desktop Shortcuts Definition
let desktopShortcuts = ['terminal', 'notes', 'calculator', 'explorer', 'music', 'settings', 'taskmanager'];

// ---------- CORE UTILITY LOGIC ----------
function loadSystemState() {
  const savedConfig = localStorage.getItem('neo_sys_config');
  if (savedConfig) {
    sysConfig = { ...sysConfig, ...JSON.parse(savedConfig) };
  }
  const savedFS = localStorage.getItem('neo_virtual_fs');
  if (savedFS) {
    try { virtualFS = JSON.parse(savedFS); } catch(e) { console.error("Error reading storage FS structures"); }
  }
  const savedShortcuts = localStorage.getItem('neo_desktop_shortcuts');
  if (savedShortcuts) {
    try { desktopShortcuts = JSON.parse(savedShortcuts); } catch(e) {}
  }
  applyConfigStyles();
}

function saveSystemState() {
  localStorage.setItem('neo_sys_config', JSON.stringify(sysConfig));
  localStorage.setItem('neo_virtual_fs', JSON.stringify(virtualFS));
  localStorage.setItem('neo_desktop_shortcuts', JSON.stringify(desktopShortcuts));
}

function applyConfigStyles() {
  document.documentElement.style.setProperty('--glass-opacity', sysConfig.glassOpacity);
  document.documentElement.style.setProperty('--glass-blur', `${parseFloat(sysConfig.glassOpacity) * 18}px`);
  if (sysConfig.theme === 'crimson') {
    document.documentElement.style.setProperty('--neon', '#f03e3e');
    document.documentElement.style.setProperty('--magenta', '#f783ac');
  } else {
    document.documentElement.style.setProperty('--neon', '#0ff');
    document.documentElement.style.setProperty('--magenta', '#f0f');
  }
}

// Global Event Handler System Toasts
function notify(msg, type = "info") {
  notificationHistory.unshift({ timestamp: new Date().toLocaleTimeString(), message: msg, type });
  updateNotifCenterUI();

  if (sysConfig.dndMode) return; 

  const container = document.getElementById("notifications");
  if (!container) return;
  const notif = document.createElement("div");
  notif.className = "notification";
  notif.innerText = `🔔 ${msg}`;
  container.appendChild(notif);
  setTimeout(() => { notif.style.opacity = '0'; setTimeout(() => notif.remove(), 200); }, 3000);
}

function updateNotifCenterUI() {
  const listContainer = document.getElementById("notifCenterList");
  const badge = document.getElementById("notifBadge");
  if (!listContainer) return;

  if (notificationHistory.length === 0) {
    listContainer.innerHTML = `<div style="padding:10px; text-align:center; opacity:0.5;">No notifications</div>`;
    badge.style.display = 'none';
    return;
  }

  badge.innerText = notificationHistory.length;
  badge.style.display = 'inline-block';

  listContainer.innerHTML = notificationHistory.map(item => `
    <div class="notif-history-item">
      <small style="opacity:0.6; display:block;">${item.timestamp}</small>
      <div>${item.message}</div>
    </div>
  `).join("");
}

// ---------- UI RENDER ENGINE ----------
function renderDesktopShortcuts() {
  const container = document.getElementById("desktopIconsContainer");
  if (!container) return;
  container.innerHTML = "";

  desktopShortcuts.forEach((appKey) => {
    const app = APP_REGISTRY[appKey];
    if (!app) return;
    const item = document.createElement("div");
    item.className = "desktop-icon";
    item.setAttribute("draggable", "true");
    item.dataset.appKey = appKey;
    item.innerHTML = `<div class="icon">${app.icon}</div><div class="label">${app.name}</div>`;
    
    item.addEventListener("dblclick", () => launchApp(appKey));
    item.addEventListener("contextmenu", (e) => handleShortcutContext(e, appKey));
    container.appendChild(item);
  });
}

// ---------- WINDOW MANAGEMENT & SNAPPING ENGINE ----------
let snapPreviewEl = null;

function createSnapPreviewElement() {
  if (!snapPreviewEl) {
    snapPreviewEl = document.createElement("div");
    snapPreviewEl.className = "snap-preview";
    document.body.appendChild(snapPreviewEl);
  }
}

function makeDraggableResizable(winElement, winId) {
  const header = winElement.querySelector(".window-header");
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  createSnapPreviewElement();

  header.addEventListener("mousedown", (e) => {
    if (e.target.closest(".window-controls")) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = winElement.offsetLeft;
    startTop = winElement.offsetTop;
    bringToFront(winId);
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    let deltaX = e.clientX - startX;
    let deltaY = e.clientY - startY;
    let newLeft = startLeft + deltaX;
    let newTop = startTop + deltaY;

    winElement.style.left = `${newLeft}px`;
    winElement.style.top = `${newTop}px`;

    // Process Drag Snapping Visual Indicators
    if (e.clientY < 10) { // Maximize preview
      snapPreviewEl.style.display = "block";
      snapPreviewEl.style.top = "0px"; snapPreviewEl.style.left = "0px";
      snapPreviewEl.style.width = "100vw"; snapPreviewEl.style.height = "calc(100vh - 52px)";
    } else if (e.clientX < 15) { // Left half snap preview
      snapPreviewEl.style.display = "block";
      snapPreviewEl.style.top = "0px"; snapPreviewEl.style.left = "0px";
      snapPreviewEl.style.width = "50vw"; snapPreviewEl.style.height = "calc(100vh - 52px)";
    } else if (e.clientX > window.innerWidth - 15) { // Right half snap preview
      snapPreviewEl.style.display = "block";
      snapPreviewEl.style.top = "0px"; snapPreviewEl.style.left = "50vw";
      snapPreviewEl.style.width = "50vw"; snapPreviewEl.style.height = "calc(100vh - 52px)";
    } else {
      snapPreviewEl.style.display = "none";
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    snapPreviewEl.style.display = "none";

    // Enforce Physical Snap Execution Positions
    const win = windows.find(w => w.id === winId);
    if (!win) return;

    if (e.clientY < 10) {
      maximizeWindow(winId, 'top');
    } else if (e.clientX < 15) {
      maximizeWindow(winId, 'left');
    } else if (e.clientX > window.innerWidth - 15) {
      maximizeWindow(winId, 'right');
    }
  });

  // Corner Bottom Right Structural Resizer
  const resizer = document.createElement("div");
  resizer.style.cssText = "position:absolute; bottom:0; right:0; width:14px; height:14px; cursor:se-resize; background:var(--neon); border-radius:0 0 12px 0; z-index:10;";
  winElement.appendChild(resizer);
  
  let isResizing = false;
  resizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    e.stopPropagation();
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    let targetWidth = e.clientX - winElement.offsetLeft;
    let targetHeight = e.clientY - winElement.offsetTop;
    winElement.style.width = `${Math.max(300, targetWidth)}px`;
    winElement.style.height = `${Math.max(200, targetHeight)}px`;
  });
  window.addEventListener("mouseup", () => isResizing = false);
}

function createWindow(title, contentHTML, width = 520, height = 400, left = 140, top = 90) {
  const winDiv = document.createElement("div");
  winDiv.className = "window";
  winDiv.style.width = `${width}px`;
  winDiv.style.height = `${height}px`;
  winDiv.style.left = `${left}px`;
  winDiv.style.top = `${top}px`;
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
  windows.push({ id, element: winDiv, title, minimized: false, isMaximized: false, layoutState: 'normal' });
  
  refreshTaskbar();
  makeDraggableResizable(winDiv, id);

  winDiv.querySelector(".win-close").onclick = () => closeWindow(id);
  winDiv.querySelector(".win-min").onclick = () => minimizeWindow(id);
  winDiv.querySelector(".win-max").onclick = () => maximizeWindow(id, 'toggle');
  winDiv.addEventListener("mousedown", () => bringToFront(id));
  
  bringToFront(id);
  return id;
}

function bringToFront(winId) {
  const win = windows.find(w => w.id === winId);
  if (!win) return;
  win.element.style.zIndex = ++windowZCounter;
  win.element.classList.add("active");
  windows.forEach(w => { if (w.id !== winId) w.element.classList.remove("active"); });
  activeWindow = winId;
  refreshTaskbar();
}

function closeWindow(winId) {
  const idx = windows.findIndex(w => w.id === winId);
  if (idx !== -1) {
    windows[idx].element.remove();
    windows.splice(idx, 1);
    refreshTaskbar();
  }
}

function minimizeWindow(winId) {
  const win = windows.find(w => w.id === winId);
  if (win) {
    win.element.style.display = "none";
    win.minimized = true;
    refreshTaskbar();
  }
}

function maximizeWindow(winId, snapDirection = 'toggle') {
  const win = windows.find(w => w.id === winId);
  if (!win) return;
  const el = win.element;

  if (snapDirection === 'toggle') {
    if (win.layoutState === 'maximized') {
      el.style.width = win.prevWidth; el.style.height = win.prevHeight;
      el.style.top = win.prevTop; el.style.left = win.prevLeft;
      win.layoutState = 'normal';
    } else {
      win.prevWidth = el.style.width; win.prevHeight = el.style.height;
      win.prevTop = el.style.top; win.prevLeft = el.style.left;
      el.style.width = "100vw"; el.style.height = "calc(100vh - 52px)";
      el.style.top = "0px"; el.style.left = "0px";
      win.layoutState = 'maximized';
    }
  } else if (snapDirection === 'top') {
    win.prevWidth = el.style.width; win.prevHeight = el.style.height;
    win.prevTop = el.style.top; win.prevLeft = el.style.left;
    el.style.width = "100vw"; el.style.height = "calc(100vh - 52px)";
    el.style.top = "0px"; el.style.left = "0px";
    win.layoutState = 'maximized';
  } else if (snapDirection === 'left') {
    win.prevWidth = el.style.width; win.prevHeight = el.style.height;
    win.prevTop = el.style.top; win.prevLeft = el.style.left;
    el.style.width = "50vw"; el.style.height = "calc(100vh - 52px)";
    el.style.top = "0px"; el.style.left = "0px";
    win.layoutState = 'left-snap';
  } else if (snapDirection === 'right') {
    win.prevWidth = el.style.width; win.prevHeight = el.style.height;
    win.prevTop = el.style.top; win.prevLeft = el.style.left;
    el.style.width = "50vw"; el.style.height = "calc(100vh - 52px)";
    el.style.top = "0px"; el.style.left = "50vw";
    win.layoutState = 'right-snap';
  }
  bringToFront(winId);
}

function refreshTaskbar() {
  const taskbarDiv = document.getElementById("taskbarList");
  if (!taskbarDiv) return;
  taskbarDiv.innerHTML = "";
  
  windows.forEach(win => {
    const btn = document.createElement("div");
    btn.className = `task-btn ${activeWindow === win.id ? 'active-task' : ''}`;
    btn.innerText = win.title;
    btn.onclick = (e) => {
      e.stopPropagation();
      if (win.minimized) {
        win.element.style.display = "flex";
        win.minimized = false;
        bringToFront(win.id);
      } else if (activeWindow === win.id) {
        minimizeWindow(win.id);
      } else {
        bringToFront(win.id);
      }
    };
    taskbarDiv.appendChild(btn);
  });
}

function launchApp(appKey) {
  if (APP_REGISTRY[appKey]) {
    APP_REGISTRY[appKey].runner();
    notify(`Launched ${APP_REGISTRY[appKey].name}`);
  }
}

// ---------- PRIORITY 1 APPLICATION MODULES ----------

// A. Advanced Structural Text Editor
function openAdvancedEditor(filePath = null) {
  let fileTitle = filePath ? filePath.split('/').pop() : "untitled.txt";
  let content = "";
  
  if (filePath) {
    const fileNode = getFSNodeFromPath(filePath);
    if (fileNode && fileNode.type === 'file') content = fileNode.content;
  }

  const contentHTML = `
    <div class="explorer-container">
      <div class="editor-controls">
        <button class="editor-btn" id="editorSave">💾 Save File</button>
        <span style="align-self:center; color:rgba(255,255,255,0.6);" id="editorFileName">${fileTitle}</span>
      </div>
      <textarea class="code-textarea" id="editorArea" placeholder="Write code/text here...">${content}</textarea>
      <div id="syntaxPreview" style="font-family:monospace; font-size:0.75rem; color:var(--magenta); margin-top:2px;">Type matching validation active (.txt/.js/.css)</div>
    </div>
  `;

  const winId = createWindow(`Editor - ${fileTitle}`, contentHTML, 600, 450);
  
  setTimeout(() => {
    const saveBtn = document.querySelector(`#desktopEnv .window:last-child #editorSave`);
    const area = document.querySelector(`#desktopEnv .window:last-child #editorArea`);
    
    saveBtn.onclick = () => {
      if (filePath) {
        const fileNode = getFSNodeFromPath(filePath);
        if (fileNode) {
          fileNode.content = area.value;
          saveSystemState();
          notify(`Saved content updates to ${fileTitle}`);
        }
      } else {
        let nameInput = prompt("Enter new filename (with extension):", "script.js");
        if (!nameInput) return;
        virtualFS.root.children['Projects'].children[nameInput] = {
          type: 'file',
          name: nameInput,
          content: area.value
        };
        saveSystemState();
        notify(`Created new data file under /Projects/${nameInput}`);
        closeWindow(winId);
        openAdvancedEditor(`root/Projects/${nameInput}`);
      }
    };
  }, 50);
}

// Helper path resolution logic
function getFSNodeFromPath(path) {
  const parts = path.split('/');
  let current = virtualFS;
  for (let i = 0; i < parts.length; i++) {
    if (current.children && current.children[parts[i]]) {
      current = current.children[parts[i]];
    } else if (current[parts[i]]) {
      current = current[parts[i]];
    } else {
      return null;
    }
  }
  return current;
}

// B. Structural Multi-Level File Explorer
function openExplorer() {
  let currentFolderPath = "root";

  function renderExplorerContent() {
    const parentNode = getFSNodeFromPath(currentFolderPath);
    const treeDiv = document.querySelector(`#desktopEnv .window:last-child #explorerTreeRoot`);
    const gridDiv = document.querySelector(`#desktopEnv .window:last-child #explorerGridRoot`);
    const pathSpan = document.querySelector(`#desktopEnv .window:last-child #explorerPathDisplay`);
    
    if (!gridDiv) return;
    pathSpan.innerText = currentFolderPath;
    gridDiv.innerHTML = "";

    if (!parentNode || !parentNode.children) return;

    Object.keys(parentNode.children).forEach(key => {
      const item = parentNode.children[key];
      const div = document.createElement("div");
      div.className = "fs-item";
      div.setAttribute("draggable", "true");
      div.dataset.name = key;

      let icon = item.type === 'folder' ? "📁" : "📄";
      if (key.endsWith(".mp3")) icon = "🎵";
      
      div.innerHTML = `<div class="fs-icon">${icon}</div><div style="word-break:break-all;">${key}</div>`;

      // Navigation Logic & Association Rules 
      div.onclick = () => {
        if (item.type === 'folder') {
          currentFolderPath = `${currentFolderPath}/${key}`;
          renderExplorerContent();
        }
      };

      // Native Context Open Association Overrides
      div.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFSContextMenu(e, currentFolderPath, key, item);
      });

      // Drag & Drop Data Population
      div.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ sourceFolder: currentFolderPath, itemName: key }));
      });

      // Drag over targets for nested logic
      if (item.type === 'folder') {
        div.addEventListener("dragover", (e) => e.preventDefault());
        div.addEventListener("drop", (e) => {
          e.preventDefault();
          const dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
          if (dragData.itemName === key) return; // Ignore circular logic
          moveFSItem(dragData.sourceFolder, currentFolderPath + '/' + key, dragData.itemName);
          renderExplorerContent();
        });
      }

      gridDiv.appendChild(div);
    });

    // Populate Left Sidebar Tree
    if (treeDiv) {
      treeDiv.innerHTML = `<div style="cursor:pointer; color:var(--neon);" id="rootHomeNode">💾 root/</div>`;
      Object.keys(virtualFS.root.children).forEach(k => {
        if (virtualFS.root.children[k].type === 'folder') {
          treeDiv.innerHTML += `<div style="cursor:pointer; padding-left:10px; font-size:0.8rem;" class="tree-node" data-path="root/${k}">└── 📁 ${k}</div>`;
        }
      });
      
      treeDiv.querySelectorAll("[data-path]").forEach(el => {
        el.onclick = () => { currentFolderPath = el.dataset.path; renderExplorerContent(); };
      });
      const home = treeDiv.querySelector("#rootHomeNode");
      if(home) home.onclick = () => { currentFolderPath = "root"; renderExplorerContent(); };
    }
  }

  const layoutHTML = `
    <div class="explorer-container">
      <div class="explorer-toolbar">
        <button class="editor-btn" id="expBack">⬅ Up</button>
        <button class="editor-btn" id="expNewFolder">📁 New Folder</button>
        <button class="editor-btn" id="expNewFile">📄 New File</button>
        <span id="explorerPathDisplay" style="font-family:monospace; opacity:0.7; font-size:0.8rem;">root</span>
      </div>
      <div class="explorer-body">
        <div class="explorer-tree" id="explorerTreeRoot"></div>
        <div class="explorer-grid" id="explorerGridRoot"></div>
      </div>
    </div>
  `;

  createWindow("File System Architecture", layoutHTML, 620, 420);

  setTimeout(() => {
    renderExplorerContent();
    const backBtn = document.querySelector(`#desktopEnv .window:last-child #expBack`);
    const newFolderBtn = document.querySelector(`#desktopEnv .window:last-child #expNewFolder`);
    const newFileBtn = document.querySelector(`#desktopEnv .window:last-child #expNewFile`);

    backBtn.onclick = () => {
      if (currentFolderPath === "root") return;
      let parts = currentFolderPath.split('/');
      parts.pop();
      currentFolderPath = parts.join('/');
      renderExplorerContent();
    };

    newFolderBtn.onclick = () => {
      let fName = prompt("Folder name:");
      if (!fName) return;
      let node = getFSNodeFromPath(currentFolderPath);
      if (node && !node.children[fName]) {
        node.children[fName] = { type: 'folder', name: fName, children: {} };
        saveSystemState(); renderExplorerContent();
      }
    };

    newFileBtn.onclick = () => {
      let fileName = prompt("File name (e.g. system.txt):");
      if (!fileName) return;
      let node = getFSNodeFromPath(currentFolderPath);
      if (node && !node.children[fileName]) {
        node.children[fileName] = { type: 'file', name: fileName, content: `// Text initialization content for ${fileName}` };
        saveSystemState(); renderExplorerContent();
      }
    };
  }, 50);
}

function moveFSItem(sourcePath, targetPath, name) {
  const sourceNode = getFSNodeFromPath(sourcePath);
  const targetNode = getFSNodeFromPath(targetPath);
  if (sourceNode && targetNode && sourceNode.children[name]) {
    targetNode.children[name] = sourceNode.children[name];
    delete sourceNode.children[name];
    saveSystemState();
    notify(`Moved ${name} to target file location.`);
  }
}

function openFSContextMenu(e, folderPath, filename, nodeItem) {
  if (currentContextMenu) currentContextMenu.remove();
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY}px`;

  let appAssociationsHTML = "";
  if (filename.endsWith(".txt") || filename.endsWith(".css") || filename.endsWith(".js")) {
    appAssociationsHTML = `
      <div id="ctxOpenNotes">Open with QuantumNotes</div>
      <div id="ctxOpenEditor">Open with Advanced Editor</div>
    `;
  } else if (filename.endsWith(".mp3")) {
    appAssociationsHTML = `<div id="ctxOpenMusic">Open with Neon Player</div>`;
  }

  menu.innerHTML = `
    ${appAssociationsHTML}
    <div id="ctxRenameFile">Rename</div>
    <div id="ctxDeleteFile" style="color:red;">Send to Bin</div>
  `;
  document.body.appendChild(menu);
  currentContextMenu = menu;

  // Intercept operations triggers
  const opEditor = menu.querySelector("#ctxOpenEditor");
  if(opEditor) opEditor.onclick = () => { openAdvancedEditor(`${folderPath}/${filename}`); menu.remove(); };
  
  const opNotes = menu.querySelector("#ctxOpenNotes");
  if(opNotes) opNotes.onclick = () => { openNotes(); menu.remove(); };

  const opMusic = menu.querySelector("#ctxOpenMusic");
  if(opMusic) opMusic.onclick = () => { openMusicPlayer(); menu.remove(); };

  menu.querySelector("#ctxRenameFile").onclick = () => {
    let targetName = prompt("Rename to:", filename);
    if (targetName) {
      let parent = getFSNodeFromPath(folderPath);
      parent.children[targetName] = parent.children[filename];
      delete parent.children[filename];
      saveSystemState();
      notify("File item identity adjusted.");
    }
    menu.remove();
  };

  menu.querySelector("#ctxDeleteFile").onclick = () => {
    let parent = getFSNodeFromPath(folderPath);
    let bin = virtualFS.root.children['Recycle Bin'];
    if (bin) {
      bin.children[filename] = parent.children[filename];
    }
    delete parent.children[filename];
    saveSystemState();
    notify(`${filename} thrown into standard Recycle Bin array.`);
    menu.remove();
  };
}

// C. Dynamic Virtual Task Manager Panel
function openTaskManager() {
  function renderManagerData() {
    const listEl = document.getElementById("tmListContainer");
    if (!listEl) return;
    listEl.innerHTML = "";

    windows.forEach(win => {
      const row = document.createElement("div");
      row.className = "tm-item";
      row.innerHTML = `
        <span>💠 ${win.title}</span>
        <div>
          <span style="font-family:monospace; margin-right:12px; font-size:0.75rem; color:var(--neon);">PID: ${win.id * 124} | Thread Active</span>
          <button class="tm-kill-btn" data-id="${win.id}">Terminate</button>
        </div>
      `;
      row.querySelector(".tm-kill-btn").onclick = () => {
        closeWindow(win.id);
        renderManagerData();
      };
      listEl.appendChild(row);
    });
  }

  const contentHTML = `
    <div class="tm-container">
      <div class="tm-stats">
        <span>CPU Load: <span id="tmCpuValue">4%</span></span>
        <span>Allocated Mem: <span id="tmMemValue">1.82 GB</span></span>
      </div>
      <div class="tm-list" id="tmListContainer"></div>
    </div>
  `;

  createWindow("Core Matrix Task Manager", contentHTML, 460, 360);
  
  setTimeout(() => {
    renderManagerData();
    // Micro Process Tick Loop Updates
    const cpuEl = document.getElementById("tmCpuValue");
    const memEl = document.getElementById("tmMemValue");
    const interval = setInterval(() => {
      if (!document.getElementById("tmListContainer")) { clearInterval(interval); return; }
      if(cpuEl) cpuEl.innerText = `${Math.floor(Math.random() * 35) + 3}%`;
      if(memEl) memEl.innerText = `${(1.2 + (windows.length * 0.15) + (Math.random()*0.05)).toFixed(2)} GB`;
    }, 1200);
  }, 40);
}

// D. Granular Dashboard System Settings Panel
function openSettingsPanel() {
  const contentHTML = `
    <div style="display:flex; flex-direction:column; gap:8px;">
      <div class="settings-group">
        <label>Neural Canvas Animated Presets</label>
        <select id="setWallpaper">
          <option value="cyber_grid" ${sysConfig.wallpaper==='cyber_grid'?'selected':''}>Cybernetic Matrix Grid</option>
          <option value="space" ${sysConfig.wallpaper==='space'?'selected':''}>Deep Cosmos Array</option>
          <option value="neon_city" ${sysConfig.wallpaper==='neon_city'?'selected':''}>Synthwave Neon Distortion</option>
        </select>
      </div>
      <div class="settings-group">
        <label>Glassmorphism Transparency Factor</label>
        <input type="range" id="setOpacity" min="0.3" max="0.95" step="0.05" value="${sysConfig.glassOpacity}">
      </div>
      <div class="settings-group">
        <label>Hardware Particle Threshold count</label>
        <input type="range" id="setCount" min="40" max="300" step="10" value="${sysConfig.particleCount}">
      </div>
      <div class="settings-group">
        <label>Boot Login Bypass Protocol</label>
        <select id="setBoot">
          <option value="true" ${sysConfig.bootScreenEnabled?'selected':''}>Initialize Standard Sequences</option>
          <option value="false" ${!sysConfig.bootScreenEnabled?'selected':''}>Bypass Direct Entry Mode</option>
        </select>
      </div>
      <div class="settings-group">
        <label>Active Theme Architecture Matrix</label>
        <select id="setTheme">
          <option value="neon" ${sysConfig.theme==='neon'?'selected':''}>Cyberpunk Cyan Standard</option>
          <option value="crimson" ${sysConfig.theme==='crimson'?'selected':''}>Barren Red Crimson Wasteland</option>
        </select>
      </div>
      <button class="editor-btn" id="saveSettingsBtn" style="margin-top:10px;">💾 Apply System Settings</button>
    </div>
  `;

  createWindow("Core Central Processing Config", contentHTML, 420, 460);

  setTimeout(() => {
    const saveBtn = document.getElementById("saveSettingsBtn");
    if(!saveBtn) return;
    saveBtn.onclick = () => {
      sysConfig.wallpaper = document.getElementById("setWallpaper").value;
      sysConfig.glassOpacity = document.getElementById("setOpacity").value;
      sysConfig.particleCount = parseInt(document.getElementById("setCount").value);
      sysConfig.bootScreenEnabled = document.getElementById("setBoot").value === "true";
      sysConfig.theme = document.getElementById("setTheme").value;
      
      saveSystemState();
      applyConfigStyles();
      initBackground(); // Regenerate underlying context array nodes
      notify("Master processing configuration pipeline synchronized.");
    };
  }, 40);
}

// ---------- DESKTOP WIDGET HANDLING PIPELINE ----------
function spawnWidget(type) {
  // Prevent duplicate instances
  if (document.getElementById(`widget-${type}`)) return;

  const widget = document.createElement("div");
  widget.className = "widget-box";
  widget.id = `widget-${type}`;
  widget.style.left = "250px";
  widget.style.top = "120px";

  if (type === 'clock') {
    widget.innerHTML = `<div style="font-weight:bold; border-bottom:1px solid; margin-bottom:4px;">🕒 TIME WIDGET</div><div id="wClockTime">--:--:--</div>`;
  } else if (type === 'weather') {
    widget.innerHTML = `<div style="font-weight:bold; border-bottom:1px solid; margin-bottom:4px;">🌤️ ATMOSPHERE</div><div>Night City: 29°C</div><div style="font-size:0.7rem; opacity:0.6;">Acid Rain Imminent</div>`;
  } else if (type === 'monitor') {
    widget.innerHTML = `<div style="font-weight:bold; border-bottom:1px solid; margin-bottom:4px;">📊 MON_ARRAY</div><div id="wMonitorData">SYS_LOAD: OK</div>`;
  }

  document.getElementById("desktopEnv").appendChild(widget);
  makeWidgetDraggable(widget);
  notify(`Widget node spawned: ${type}`);
}

function makeWidgetDraggable(el) {
  let drag = false, sx, sy, sl, st;
  el.addEventListener("mousedown", (e) => {
    if (e.button === 2) return; // Ignore right-clicks
    drag = true;
    sx = e.clientX; sy = e.clientY;
    sl = el.offsetLeft; st = el.offsetTop;
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!drag) return;
    el.style.left = `${sl + (e.clientX - sx)}px`;
    el.style.top = `${st + (e.clientY - sy)}px`;
  });
  window.addEventListener("mouseup", () => drag = false);
  
  // Right-click widget removal shortcut rules
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Disconnect widget endpoint connection?")) {
      el.remove();
    }
  });
}

// ---------- USER INPUT INTERACTION SYSTEM PRESETS ----------

// Base Native Window Legacy System Apps Fallback Handlers
function openTerminal() {
  const content = `<div id="term-${Date.now()}" style="height:260px; overflow-y:auto; background:#000000aa; padding:6px; font-family:monospace; color:#0f0;"><div style="color:var(--neon);">> NEO-OS Terminal Terminal Command Processor. v2.7</div><div id="termHistory"></div><div><span>> </span><input type="text" id="termInput" style="background:transparent; border:none; color:#0f0; outline:none; width:80%; font-family:monospace;"></div></div>`;
  createWindow("Sudo Shell Access", content, 560, 320);
  setTimeout(() => {
    const input = document.querySelector(`#desktopEnv .window:last-child #termInput`);
    const historyDiv = document.querySelector(`#desktopEnv .window:last-child #termHistory`);
    input?.focus();

    input?.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') {
        let val = input.value.trim();
        if (!val) return;
        historyDiv.innerHTML += `<div>$ ${val}</div>`;
        
        let tokens = val.split(" ");
        let baseCmd = tokens[0].toLowerCase();

        if (baseCmd === "help") {
          historyDiv.innerHTML += `<div>Available endpoints: help, clear, whoami, sudo play game, date, neofetch</div>`;
        } else if (baseCmd === "clear") {
          historyDiv.innerHTML = "";
        } else if (baseCmd === "whoami") {
          historyDiv.innerHTML += `<div>root_neural_operator@NEO-OS-2077</div>`;
        } else if (val === "sudo play game") {
          historyDiv.innerHTML += `<div>Initializing system embedded terminal hardware simulation layers...</div>`;
          launchSnakeGame();
        } else if (baseCmd === "neofetch") {
          historyDiv.innerHTML += `<div>⚡ NEO-OS 2077 Enhanced Edition<br>Kernel: Vanilla-JS-Web-Build-v3.0<br>Uptime: Active Neural Lock<br>Shell: NeuralAccessEngine</div>`;
        } else {
          historyDiv.innerHTML += `<div>Engine parsing error: Execution parameter '${baseCmd}' unknown.</div>`;
        }
        input.value = "";
        historyDiv.scrollTop = historyDiv.scrollHeight;
      }
    });
  }, 40);
}

function openNotes() {
  let notes = JSON.parse(localStorage.getItem("neon_notes") || '{"Manifesto":"Welcome back to the grid operator. Avoid corporate telemetry vectors."}');
  const content = `
    <div style="display:flex; flex-direction:column; height:100%; gap:6px;">
      <div style="display:flex; gap:6px;">
        <select id="noteSelector" style="flex:1; background:#000; color:var(--neon); border:1px solid var(--neon);"></select>
        <button id="newNoteBtn" class="editor-btn">+</button>
      </div>
      <textarea id="noteEditor" style="flex:1; width:100%; background:#021a2a; color:var(--neon); border:1px solid var(--neon); padding:8px; resize:none; outline:none;"></textarea>
    </div>
  `;
  createWindow("Quantum Notes Database", content, 420, 340);
  setTimeout(() => {
    const sel = document.querySelector(`#desktopEnv .window:last-child #noteSelector`);
    const editor = document.querySelector(`#desktopEnv .window:last-child #noteEditor`);
    const newBtn = document.querySelector(`#desktopEnv .window:last-child #newNoteBtn`);
    
    function refresh() {
      sel.innerHTML = "";
      Object.keys(notes).forEach(k => { let opt=document.createElement("option"); opt.value=k; opt.innerText=k; sel.appendChild(opt); });
      if(Object.keys(notes).length) editor.value = notes[sel.value] || "";
    }
    sel.onchange = () => { editor.value = notes[sel.value]; };
    editor.oninput = () => { if(sel.value) { notes[sel.value] = editor.value; localStorage.setItem("neon_notes", JSON.stringify(notes)); } };
    newBtn.onclick = () => { let title = prompt("Note Identity title:"); if(title){ notes[title]=""; refresh(); sel.value=title; editor.value=""; } };
    refresh();
  }, 40);
}

function openCalculator() {
  let content = `<div><input type="text" id="calcScreen" readonly style="width:100%; background:#111; color:var(--neon); padding:12px; border:1px solid var(--neon); border-radius:6px; font-family:monospace; text-align:right; font-size:1.2rem;"><div class="calc-buttons" id="calcGrid"></div></div>`;
  createWindow("CyberCalc Matrix", content, 300, 400);
  setTimeout(() => {
    const btns = ["7","8","9","/","4","5","6","*","1","2","3","-","0","C","=","+"];
    const grid = document.querySelector(`#desktopEnv .window:last-child #calcGrid`);
    const screen = document.querySelector(`#desktopEnv .window:last-child #calcScreen`);
    let expr = "";
    btns.forEach(b => {
      let div = document.createElement("div"); div.className = "calc-btn"; div.innerText = b;
      div.onclick = () => {
        if(b === "C") expr="";
        else if(b === "=") { try { expr = eval(expr).toString(); } catch(e){ expr="Error"; } }
        else expr+=b;
        screen.value=expr;
      };
      grid.appendChild(div);
    });
  }, 40);
}

function openMusicPlayer() {
  const content = `
    <div style="display:flex; flex-direction:column; gap:8px;">
      <input type="file" id="mp3Upload" accept="audio/mpeg" multiple style="color:var(--neon); font-size:0.8rem;">
      <div id="playlist" style="max-height:120px; overflow-y:auto; background:rgba(0,0,0,0.3); padding:4px; border-radius:6px;"></div>
      <audio id="audioPlayer" controls style="width:100%; margin-top:4px;"></audio>
      <div style="font-family:monospace; font-size:0.75rem; text-align:center; color:var(--magenta);">Frequency Modulation Equalizer Active</div>
    </div>
  `;
  createWindow("Neon Audio Interface", content, 440, 320);
  setTimeout(() => {
    const audio = document.querySelector(`#desktopEnv .window:last-child #audioPlayer`);
    const playlistDiv = document.querySelector(`#desktopEnv .window:last-child #playlist`);
    const upload = document.querySelector(`#desktopEnv .window:last-child #mp3Upload`);
    let trackList = [];
    
    function renderTracks() {
      playlistDiv.innerHTML = trackList.map((t, i) => `<div class="start-item" style="padding:4px; font-size:0.8rem;" data-track-idx="${i}">🎵 ${t.name}</div>`).join("");
      playlistDiv.querySelectorAll("[data-track-idx]").forEach(el => {
        el.onclick = () => {
          audio.src = URL.createObjectURL(trackList[el.dataset.trackIdx]);
          audio.play();
          notify(`Playing track node audio track.`);
        };
      });
    }
    upload.onchange = (e) => { trackList.push(...e.target.files); renderTracks(); };
  }, 40);
}

// ---------- PRIORITY 3 FUN & EASTER EGGS ELEMENTS ----------

// Hidden System Snake Simulation App
function launchSnakeGame() {
  const canvasHTML = `
    <div style="text-align:center;">
      <canvas id="snakeCanvas" width="300" height="300" style="background:#010912; border:2px solid var(--neon);"></canvas>
      <div style="font-family:monospace; font-size:0.8rem; margin-top:6px; color:var(--magenta);">Use Arrow Keys or WASD Controls</div>
    </div>
  `;
  createWindow("Arcade Protocol: Snake", canvasHTML, 340, 380);

  setTimeout(() => {
    const canvas = document.getElementById("snakeCanvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    let box = 15; let snake = [{x:10*box, y:10*box}];
    let dir = "RIGHT";
    let food = { x: Math.floor(Math.random()*20)*box, y: Math.floor(Math.random()*20)*box };
    
    // Scoped Keyboard Keydown Interception
    const handleGameKeys = (e) => {
      let key = e.key.toLowerCase();
      if ((key === 'a' || e.key === 'ArrowLeft') && dir !== "RIGHT") dir = "LEFT";
      else if ((key === 'w' || e.key === 'ArrowUp') && dir !== "DOWN") dir = "UP";
      else if ((key === 'd' || e.key === 'ArrowRight') && dir !== "LEFT") dir = "RIGHT";
      else if ((key === 's' || e.key === 'ArrowDown') && dir !== "UP") dir = "DOWN";
    };
    window.addEventListener("keydown", handleGameKeys);

    let gameInterval = setInterval(() => {
      if(!document.getElementById("snakeCanvas")) { clearInterval(gameInterval); window.removeEventListener("keydown", handleGameKeys); return; }
      
      // Paint Frame Logic loops
      ctx.fillStyle = "#010912"; ctx.fillRect(0,0,300,300);
      
      // Draw Food
      ctx.fillStyle = "var(--magenta)"; ctx.fillRect(food.x, food.y, box, box);
      
      // Draw Snake Body segments
      for(let i=0; i<snake.length; i++) {
        ctx.fillStyle = i === 0 ? "var(--neon)" : "#005577";
        ctx.fillRect(snake[i].x, snake[i].y, box, box);
      }
      
      let hx = snake[0].x; let hy = snake[0].y;
      if(dir === "LEFT") hx -= box; if(dir === "UP") hy -= box;
      if(dir === "RIGHT") hx += box; if(dir === "DOWN") hy += box;
      
      if(hx === food.x && hy === food.y) {
        food = { x: Math.floor(Math.random()*20)*box, y: Math.floor(Math.random()*20)*box };
      } else {
        snake.pop();
      }
      
      let newHead = {x:hx, y:hy};
      // Self collision or bounds metrics failures resets game bounds
      if(hx < 0 || hx >= 300 || hy < 0 || hy >= 300) {
        clearInterval(gameInterval); notify("Virtual Simulation Crash Terminated."); closeWindow(windows.find(w=>w.title.includes("Snake"))?.id);
      }
      snake.unshift(newHead);
    }, 130);
  }, 50);
}

// Global System Web Speech Voice Recognition Orchestration Engine
let voiceRecognitionInstance = null;
function initVoiceRecognitionEngine() {
  const SpeechEngine = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechEngine) {
    notify("Hardware environment lacks continuous processing support for Web Speech API.");
    return;
  }
  voiceRecognitionInstance = new SpeechEngine();
  voiceRecognitionInstance.continuous = false;
  voiceRecognitionInstance.lang = 'en-US';

  voiceRecognitionInstance.onstart = () => {
    document.getElementById("micBtn").style.background = "var(--magenta)";
    notify("Speech recognition online... State command vocal parameters.");
  };

  voiceRecognitionInstance.onresult = (event) => {
    let rawText = event.results[0][0].transcript.toLowerCase();
    notify(`Voice telemetry captured parsing segment: "${rawText}"`);
    
    if (rawText.includes("open terminal")) launchApp('terminal');
    else if (rawText.includes("play music")) launchApp('music');
    else if (rawText.includes("open notes")) launchApp('notes');
    else if (rawText.includes("close all")) {
      [...windows].forEach(w => closeWindow(w.id));
      notify("Master reset execution cycle finalized.");
    }
  };

  voiceRecognitionInstance.onend = () => {
    document.getElementById("micBtn").style.background = "transparent";
  };
  voiceRecognitionInstance.start();
}

// ---------- BACKGROUND MATRIX PARTH ENGINES (ANIMATIONS) ----------
let bgCanvas, bgCtx, bgParticles = [];

function initBackground() {
  bgCanvas = document.getElementById("cyber-bg");
  if (!bgCanvas) return;
  bgCtx = bgCanvas.getContext("2d");
  
  function resize() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
  window.addEventListener("resize", resize); resize();
  
  bgParticles = [];
  for (let i = 0; i < sysConfig.particleCount; i++) {
    bgParticles.push({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.width,
      vx: (Math.random() - 0.5) * sysConfig.particleSpeed * 2,
      vy: (Math.random() - 0.5) * sysConfig.particleSpeed * 2,
      size: Math.random() * 2.5 + 1
    });
  }
  
  // Optimization: Single animation request loops
  function renderFrame() {
    if (screensaverActive) return; // Yield rendering load entirely if Screensaver overloads active viewport context
    bgCtx.fillStyle = "rgba(0,0,0,0.15)";
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    bgCtx.shadowBlur = 4;
    bgCtx.shadowColor = sysConfig.theme === 'crimson' ? '#f03e3e' : '#0ff';
    bgCtx.fillStyle = sysConfig.theme === 'crimson' ? '#ff8787' : '#0ff';

    bgParticles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = bgCanvas.width; if (p.x > bgCanvas.width) p.x = 0;
      if (p.y < 0) p.y = bgCanvas.height; if (p.y > bgCanvas.height) p.y = 0;
      
      bgCtx.beginPath();
      // Render geometry paths according to presets
      if (sysConfig.wallpaper === 'space') {
        bgCtx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
      } else if (sysConfig.wallpaper === 'neon_city') {
        bgCtx.fillRect(p.x, p.y, p.size * 3, p.size * 3);
      } else { // cyber_grid default structures
        bgCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      bgCtx.fill();
    });
    requestAnimationFrame(renderFrame);
  }
  renderFrame();
}

// Automated Matrix Screensaver Rain System
function runScreensaverLoop() {
  const canvas = document.getElementById("screensaverCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  
  const columns = Math.floor(canvas.width / 14);
  const drops = Array(columns).fill(1);

  function drawRain() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f0"; ctx.font = "14px monospace";

    for (let i = 0; i < drops.length; i++) {
      const text = String.fromCharCode(33 + Math.floor(Math.random() * 93));
      ctx.fillText(text, i * 14, drops[i] * 14);
      if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    if(screensaverActive) screensaverLoopId = requestAnimationFrame(drawRain);
  }
  drawRain();
}

function wakeSystem() {
  lastInputTime = Date.now();
  if (screensaverActive) {
    screensaverActive = false;
    cancelAnimationFrame(screensaverLoopId);
    document.getElementById("screensaverCanvas").style.display = "none";
    notify("Neural telemetry connection wake state verified.");
  }
}

// ---------- SYSTEM INTENT HOOK INTEGRATIONS ----------
window.onload = () => {
  loadSystemState();
  renderDesktopShortcuts();

  // Watch input vectors to drive automated screensaver triggers
  ['click', 'mousemove', 'keydown'].forEach(evt => window.addEventListener(evt, wakeSystem));
  setInterval(() => {
    if (Date.now() - lastInputTime > 120000 && !screensaverActive) { // 2 minutes window threshold
      screensaverActive = true;
      document.getElementById("screensaverCanvas").style.display = "block";
      runScreensaverLoop();
    }
  }, 10000);

  // Global Context click binding interception points
  document.getElementById("startBtn").onclick = (e) => {
    e.stopPropagation();
    const m = document.getElementById("startMenu");
    m.style.display = m.style.display === "flex" ? "none" : "flex";
  };
  
  document.getElementById("notifBellBtn").onclick = (e) => {
    e.stopPropagation();
    const c = document.getElementById("notifCenter");
    c.style.display = c.style.display === "flex" ? "none" : "flex";
  };

  document.getElementById("clearNotifsBtn").onclick = () => { notificationHistory = []; updateNotifCenterUI(); };
  document.getElementById("dndCheckbox").onchange = (e) => { sysConfig.dndMode = e.target.checked; };

  document.addEventListener("click", () => {
    document.getElementById("startMenu").style.display = "none";
    document.getElementById("notifCenter").style.display = "none";
    if (currentContextMenu) currentContextMenu.remove();
  });

  // Structural Delegation Launch binding maps
  document.querySelectorAll(".start-item[data-app]").forEach(item => {
    item.onclick = () => launchApp(item.dataset.app);
  });

  // Micro Button speech registration point hooks
  document.getElementById("micBtn").onclick = (e) => { e.stopPropagation(); initVoiceRecognitionEngine(); };

  // Master Global Intercept Shortcut Hotkeys Matrix rules configurations
  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === ' ') { // Alt+Space -> Toggle Start Menu
      e.preventDefault();
      const m = document.getElementById("startMenu");
      m.style.display = m.style.display === "flex" ? "none" : "flex";
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'n') { // Ctrl+N -> New Note shortcut route bind
      e.preventDefault(); launchApp('notes');
    }
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'T') { // Ctrl+Shift+T -> New Terminal shell
      e.preventDefault(); launchApp('terminal');
    }
  });

  // Base Desktop Grid Surface Operations Hooks Context Controls
  const mainDesktop = document.getElementById("desktopEnv");
  mainDesktop.addEventListener("contextmenu", (e) => {
    if (e.target !== mainDesktop && e.target.id !== "cyber-bg") return;
    e.preventDefault();
    if (currentContextMenu) currentContextMenu.remove();

    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    menu.innerHTML = `
      <div id="wClock">Spawn Clock Widget</div>
      <div id="wWeather">Spawn Weather Widget</div>
      <div id="wMonitor">Spawn Monitor Widget</div>
      <hr style="border-color:rgba(0,255,255,0.2);">
      <div id="wSettings">Open Settings Panel</div>
    `;
    document.body.appendChild(menu);
    currentContextMenu = menu;

    menu.querySelector("#wClock").onclick = () => spawnWidget('clock');
    menu.querySelector("#wWeather").onclick = () => spawnWidget('weather');
    menu.querySelector("#wMonitor").onclick = () => spawnWidget('monitor');
    menu.querySelector("#wSettings").onclick = () => launchApp('settings');
  });

  // Rapid Desktop Rapid Clinking Sequence Detector (Easter Egg Credit Wallpaper Injection Rule)
  mainDesktop.addEventListener("click", (e) => {
    if (e.target !== mainDesktop && e.target.id !== "cyber-bg") return;
    desktopClickCount++;
    clearTimeout(desktopClickTimer);
    desktopClickTimer = setTimeout(() => {
      if (desktopClickCount >= 10) {
        notify("🔓 DEV TELEMETRY OVERWRITE: System Design credits assigned to Neon Architect.", "secret");
        document.body.style.background = "radial-gradient(circle, #3b0066 0%, #000000 100%)";
      }
      desktopClickCount = 0;
    }, 2500);
  });

  // Execute Bootstrap Animation Pipeline Timing Paths sequences initialization rules checks
  if (sysConfig.bootScreenEnabled) {
    setTimeout(() => {
      document.getElementById("bootScreen").style.display = "none";
      document.getElementById("loginScreen").style.display = "flex";
    }, 2400);
  } else {
    document.getElementById("bootScreen").style.display = "none";
    document.getElementById("loginScreen").style.display = "none";
    mainDesktop.style.display = "block";
    initBackground();
  }

  document.getElementById("loginBtn").onclick = () => {
    const u = document.getElementById("loginUser").value.trim() || "operator";
    document.getElementById("loginScreen").style.display = "none";
    mainDesktop.style.display = "block";
    initBackground();
    notify(`Neural session token bound to identity: ${u}`);
  };

  // Clock Tick Loop Handler Instance mapping initialization tracking loops updates bindings
  setInterval(() => {
    const d = new Date();
    const clk = document.getElementById("liveClock");
    if(clk) clk.innerText = d.toLocaleTimeString('en-US', { hour12: false });
    
    // Mirror background loops to bound widget models instances maps if visible inside current DOM layer context view tree
    const wC = document.getElementById("wClockTime");
    if(wC) wC.innerText = d.toLocaleTimeString('en-US', { hour12: false });
    
    const wM = document.getElementById("wMonitorData");
    if(wM) wM.innerText = `SYS_CORE: ${Math.floor(Math.random()*15 + 85)}% OK\nMEM_VEC: PASS`;
  }, 1000);
};

// Isolated Custom Desktop Item Shortcut Actions Config Menu Interceptor Engine Logic block
function handleShortcutContext(e, appKey) {
  e.preventDefault(); e.stopPropagation();
  if (currentContextMenu) currentContextMenu.remove();

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY}px`;
  menu.innerHTML = `
    <div id="shRename">Rename App Link</div>
    <div id="shDelete" style="color:red;">Remove Shortcut</div>
  `;
  document.body.appendChild(menu);
  currentContextMenu = menu;

  menu.querySelector("#shRename").onclick = () => {
    let t = prompt("Change label link identifier title to:", APP_REGISTRY[appKey].name);
    if(t) { APP_REGISTRY[appKey].name = t; renderDesktopShortcuts(); saveSystemState(); }
  };
  menu.querySelector("#shDelete").onclick = () => {
    desktopShortcuts = desktopShortcuts.filter(k => k !== appKey);
    renderDesktopShortcuts(); saveSystemState(); notify("Shortcut mapping entry purged from screen tree array context layer.");
  };
}
