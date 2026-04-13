import { contextBridge, ipcRenderer } from 'electron';

const electronApi = {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
