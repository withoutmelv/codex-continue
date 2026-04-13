import { ipcMain } from 'electron';
import { CodexSessionRepo } from '../services/codexSessionRepo';
import { readSessionTranscript } from '../services/sessionTranscriptParser';

export function registerSessionHandlers(repo = new CodexSessionRepo()) {
  ipcMain.handle('sessions:list', () => ({
    sessions: repo.listSessions(),
  }));

  ipcMain.handle('sessions:getTranscript', (_event, rolloutPath: string) => ({
    entries: readSessionTranscript(rolloutPath),
  }));
}
