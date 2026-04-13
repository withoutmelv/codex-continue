import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  readRoundRequest,
  writeRoundRequest,
} from '../../electron/main/services/taskDirectories';

describe('runner queue', () => {
  it('writes and reads a round request file', () => {
    const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-queue-'));
    writeRoundRequest(taskDir, {
      roundNumber: 1,
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      timeoutMs: 1000,
    });

    const request = readRoundRequest(taskDir, 1);
    expect(request.sessionId).toBe('session-1');
  });
});
