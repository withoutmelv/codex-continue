import { ipcMain } from 'electron';
import { CodexSessionRepo } from '../services/codexSessionRepo';

export function registerSessionHandlers(repo = new CodexSessionRepo()) {
  ipcMain.handle('sessions:list', () => ({
    sessions: repo.listSessions(),
  }));
}
