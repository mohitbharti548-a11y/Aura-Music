// desktop/preload.js - Secure Preload Bridge for Aura Desktop
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDesktop: true,
  onMediaKey: (callback) => {
    const handler = (_event, key) => callback(key);
    ipcRenderer.on('media-key', handler);
    return () => ipcRenderer.removeListener('media-key', handler);
  },
});
