
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const DB_PATH = path.join(app.getPath('userData'), 'db.json');

async function readDb() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}; // Return empty object if not found
    }
    throw error;
  }
}

async function writeDb(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  ipcMain.handle('read-db', async () => {
    return await readDb();
  });

  ipcMain.handle('write-db', async (event, data) => {
    await writeDb(data);
  });

  // Adjust the path to the Next.js output
  const startUrl = process.env.ELECTRON_START_URL || new URL(
    path.join(__dirname, '../out/index.html'),
    'file:'
  ).toString();
  win.loadURL(startUrl);

  // Optional: Open DevTools.
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
