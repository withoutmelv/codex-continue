import { contextBridge, ipcRenderer } from 'electron';

const electronApi = {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  startTask: (input: unknown) => ipcRenderer.invoke('tasks:start', input),
  stopTask: (taskId: string) => ipcRenderer.invoke('tasks:stop', taskId),
  listTasks: () => ipcRenderer.invoke('tasks:list'),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
