import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTaskHandlers } from './ipc/tasks';
import { registerSessionHandlers } from './ipc/sessions';
import { TaskRuntime } from './services/taskRuntime';
import { TaskStore } from './services/taskStore';

const isDev = !app.isPackaged;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    webPreferences: {
      preload: isDev
        ? path.join(__dirname, '../preload/index.js')
        : path.join(__dirname, 'index.mjs'),
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

  const taskStore = new TaskStore(path.join(app.getPath('userData'), 'app.sqlite'));
  const taskRuntime = new TaskRuntime(taskStore);
  const taskHandlers = createTaskHandlers({
    createTask: async (input) => taskStore.createTask(input),
    runTask: async (input) => taskRuntime.runTask(input),
    stopTask: async (taskId) => taskRuntime.stopTask(taskId),
    listActiveTasks: async () => taskStore.listActiveTasks(),
  });

  ipcMain.handle('tasks:start', (_event, input) => taskHandlers.start(input));
  ipcMain.handle('tasks:stop', (_event, taskId) => taskHandlers.stop(taskId));
  ipcMain.handle('tasks:list', () => taskHandlers.list());

  createWindow();
});
