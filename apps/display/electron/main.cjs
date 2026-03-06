const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

// Config from CLI args, env vars, or platform launcher
const config = {
  sessionId: process.env.SESSION_ID ?? '',
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:3000',
  stage: process.env.STAGE ?? 'local',
}

// Register IPC handlers BEFORE creating the window
ipcMain.handle('get-session-id', () => config.sessionId)
ipcMain.handle('get-backend-url', () => config.backendUrl)
ipcMain.handle('get-stage', () => config.stage)

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  // Open DevTools unless production
  if (config.stage !== 'production') {
    mainWindow.webContents.openDevTools()
  }

  // In dev mode, load from the Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // Production: load the built index.html
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
