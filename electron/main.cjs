const { app, BrowserWindow, ipcMain, dialog, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
const isMac = process.platform === 'darwin';

function createWindow() {
  // 1440x900, or the screen's usable area if that is smaller. Without an OS
  // frame, Windows no longer squeezes an oversized window in: on a 1366x768
  // laptop it hung past every edge and over the taskbar.
  const work = screen.getPrimaryDisplay().workArea;
  const tooSmall = work.width < 1440 || work.height < 900;
  mainWindow = new BrowserWindow({
    width: Math.min(1440, work.width),
    height: Math.min(900, work.height),
    minWidth: Math.min(1024, work.width),
    minHeight: Math.min(700, work.height),
    center: true,
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

  // a small screen starts maximised - filling the space above the taskbar
  if (tooSmall) mainWindow.maximize();
  mainWindow.once('ready-to-show', () => mainWindow.show());

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
