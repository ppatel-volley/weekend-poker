import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: 'ELECTRON',
  isElectron: true,
})
