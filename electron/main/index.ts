import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTaskHandlers } from './ipc/tasks';
import { registerSessionHandlers } from './ipc/sessions';
import { TaskRuntime } from './services/taskRuntime';
import { TaskStore } from './services/taskStore';
import { createMainWindow, resolveRendererEntry } from './window';

const isDev = !app.isPackaged;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const window = createMainWindow(__dirname, isDev);

  if (isDev) {
    void window.loadURL(resolveRendererEntry(__dirname, true));
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    void window.loadFile(resolveRendererEntry(__dirname, false));
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
