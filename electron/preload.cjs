const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  saveProjectFile: (data) => ipcRenderer.invoke('save-project-file', data),
  openProjectFile: () => ipcRenderer.invoke('open-project-file')
});
