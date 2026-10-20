const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  // Word correction (the system's spellchecker, on this computer): which words
  // are misspelled, and what they probably should be.
  spell: {
    misspelled: (word) => webFrame.isWordMisspelled(word),
    suggestions: (word) => webFrame.getWordSuggestions(word)
  },
  saveProjectFile: (data) => ipcRenderer.invoke('save-project-file', data),
  openProjectFile: () => ipcRenderer.invoke('open-project-file'),
  window: {
    minimize: () => ipcRenderer.send('win:minimize'),
    toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
    close: () => ipcRenderer.send('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:is-maximized'),
    onMaximized: (cb) => {
      const listener = (_e, value) => cb(value);
      ipcRenderer.on('win:maximized', listener);
      return () => ipcRenderer.removeListener('win:maximized', listener);
    }
  }
});
