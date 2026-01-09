import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    // Dev mode: load from Vite dev server
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    // Prod mode: load from bundled HTML
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when dock icon is clicked and no windows open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow();
});
