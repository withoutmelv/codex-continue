import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerSessionHandlers } from './ipc/sessions';

const isDev = !app.isPackaged;

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  if (isDev) {
    void window.loadURL('http://localhost:5173');
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    void window.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

void app.whenReady().then(() => {
  registerSessionHandlers();
  createWindow();
});
