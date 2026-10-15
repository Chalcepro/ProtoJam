const { app, BrowserWindow, ipcMain, dialog, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
const isMac = process.platform === 'darwin';

const boundsFile = () => path.join(app.getPath('userData'), 'window-bounds.json');

// The saved window, if it still fits this screen.
function loadBounds(work) {
  try {
    const b = JSON.parse(fs.readFileSync(boundsFile(), 'utf-8'));
    const fits = b.width <= work.width && b.height <= work.height &&
      b.x >= work.x && b.y >= work.y && b.x + b.width <= work.x + work.width && b.y + b.height <= work.y + work.height;
    return fits ? b : null;
  } catch { return null; }
}

function createWindow() {
  // A normal window, never full screen: the size and place it was left at,
  // else 1440x900 shrunk to fit (85% of a small screen), centred. Without an
  // OS frame Windows no longer squeezes an oversized window onto the screen.
  const work = screen.getPrimaryDisplay().workArea;
  const saved = loadBounds(work);
  mainWindow = new BrowserWindow({
    width: saved?.width ?? Math.min(1440, Math.round(work.width * 0.85)),
    height: saved?.height ?? Math.min(900, Math.round(work.height * 0.85)),
    ...(saved ? { x: saved.x, y: saved.y } : { center: true }),
    minWidth: Math.min(800, work.width),
    minHeight: Math.min(560, work.height),
    show: false,
    title: 'ProtoJam — UI/UX Prototyping Suite',
    backgroundColor: '#121316',
    // No OS title bar or File/Edit/View/Window menu: ProtoJam's own top bar
    // is the title bar and draws its own minimise / maximise / close buttons.
    // macOS keeps its native traffic lights, inset into that bar.
    ...(isMac ? { titleBarStyle: 'hiddenInset' } : { frame: false }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  // remember the windowed size and place (not the maximised one)
  mainWindow.on('close', () => {
    try { fs.writeFileSync(boundsFile(), JSON.stringify(mainWindow.getNormalBounds())); } catch {}
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Tell the top bar when the window is maximised, so its middle button
  // can show "restore" instead of "maximise".
  const sendMaximized = () => mainWindow.webContents.send('win:maximized', mainWindow.isMaximized());
  mainWindow.on('maximize', sendMaximized);
  mainWindow.on('unmaximize', sendMaximized);

  // With the menu gone, its F12 / Ctrl+R shortcuts go too; keep them in dev.
  if (isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'F12') mainWindow.webContents.toggleDevTools();
      else if (input.control && input.key.toLowerCase() === 'r') mainWindow.webContents.reload();
    });
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  if (!isMac) Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for saving/opening project files
ipcMain.handle('save-project-file', async (event, data) => {
  if (!mainWindow) return null;
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save ProtoJam Project',
    defaultPath: 'project.protojam',
    filters: [{ name: 'ProtoJam Files', extensions: ['protojam', 'json'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }
  return null;
});

ipcMain.handle('open-project-file', async () => {
  if (!mainWindow) return null;
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open ProtoJam Project',
    properties: ['openFile'],
    filters: [{ name: 'ProtoJam Files', extensions: ['protojam', 'json'] }]
  });

  if (filePaths && filePaths.length > 0) {
    const content = fs.readFileSync(filePaths[0], 'utf-8');
    return JSON.parse(content);
  }
  return null;
});

// Window buttons drawn by the top bar
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:toggle-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize();
});
ipcMain.on('win:close', () => mainWindow?.close());
ipcMain.handle('win:is-maximized', () => mainWindow?.isMaximized() ?? false);
