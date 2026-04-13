import { contextBridge, ipcRenderer } from 'electron';

const electronApi = {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  getSessionTranscript: (rolloutPath: string) =>
    ipcRenderer.invoke('sessions:getTranscript', rolloutPath),
  startTask: (input: unknown) => ipcRenderer.invoke('tasks:start', input),
  stopTask: (taskId: string) => ipcRenderer.invoke('tasks:stop', taskId),
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  getTaskSnapshot: (taskId: string) => ipcRenderer.invoke('tasks:getSnapshot', taskId),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
