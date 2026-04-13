import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TaskStore } from '../../electron/main/services/taskStore';

describe('TaskStore', () => {
  it('creates a managed task and stores round results', () => {
    const dbPath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'codex-task-store-')),
      'app.sqlite',
    );
    const store = new TaskStore(dbPath);

    const task = store.createTask({
      sessionId: '019d826a',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      targetRounds: 8,
      perRoundTimeoutMs: 900_000,
    });

    store.recordRound({
      taskId: task.taskId,
      roundNumber: 1,
      exitCode: 0,
      resultType: 'STATUS: RETRY',
      lastMessage: 'STATUS: RETRY',
      durationMs: 1_234,
    });

    const snapshot = store.getTaskSnapshot(task.taskId);
    expect(snapshot.task.completedRounds).toBe(1);
    expect(snapshot.rounds).toHaveLength(1);
  });
});
