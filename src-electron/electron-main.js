import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import os from 'node:os'
import {
  registerQuasarRuntime,
  resolveElectronAssetsPath
} from '#q-app/electron/main'

const PRODUCT_NAME = 'ParkKasa'
const APP_ID = 'tr.parkkasa.desktop'
const DEFAULT_UPDATE_URL = 'https://updates.parkkasa.com/desktop'

const platform = process.platform || os.platform()

if (app.setAppUserModelId) {
  app.setAppUserModelId(APP_ID)
}

async function setupAutoUpdate () {
  if (import.meta.env.QUASAR_DEV) return
  const feed = process.env.ELECTRON_UPDATE_URL || DEFAULT_UPDATE_URL
  if (!feed) return
  try {
    const { autoUpdater } = await import('electron-updater')
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.setFeedURL({ provider: 'generic', url: feed })
    autoUpdater.on('error', (err) => {
      console.warn('[ParkKasa] güncelleme:', err?.message || err)
    })
    await autoUpdater.checkForUpdatesAndNotify()
  } catch (err) {
    console.warn('[ParkKasa] otomatik güncelleme atlandı:', err?.message || err)
  }
}

async function createWindow () {
  const mainWindow = new BrowserWindow({
    icon: resolveElectronAssetsPath('icons/icon.png'),
    title: PRODUCT_NAME,
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, 'electron-preload.cjs')
    }
  })

  if (import.meta.env.QUASAR_DEV) {
    await mainWindow.loadURL(import.meta.env.QUASAR_APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  if (import.meta.env.QUASAR_DEBUG) {
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }
}

void app.whenReady().then(() => {
  app.setName(PRODUCT_NAME)
  registerQuasarRuntime()
  ipcMain.handle('parkkasa:printHtml', async (_event, html) => {
    const win = new BrowserWindow({ show: false })
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(String(html || ''))}`)
    await new Promise((resolve) => {
      win.webContents.print({ silent: false }, () => {
        win.close()
        resolve()
      })
    })
  })
  void setupAutoUpdate()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})
