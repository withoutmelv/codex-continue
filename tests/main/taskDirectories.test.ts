import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ensureTaskDirectories,
  removeTaskDirectory,
} from '../../electron/main/services/taskDirectories';

describe('taskDirectories', () => {
  it('removes a managed task directory recursively', () => {
    const taskDir = path.join(
      os.tmpdir(),
      'codex-continue-test',
      `task-${Date.now()}`,
    );

    ensureTaskDirectories(taskDir);
    fs.writeFileSync(path.join(taskDir, 'results', '1.json'), '{}');

    removeTaskDirectory(taskDir);

    expect(fs.existsSync(taskDir)).toBe(false);
  });
});
