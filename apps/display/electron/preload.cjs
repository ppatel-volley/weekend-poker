const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getSessionId: () => ipcRenderer.invoke('get-session-id'),
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  getStage: () => ipcRenderer.invoke('get-stage'),
  platform: 'ELECTRON',
  isElectron: true,
})
