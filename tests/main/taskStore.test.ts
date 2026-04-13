import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TaskStore } from '../../electron/main/services/taskStore';

describe('TaskStore', () => {
  it('returns one task summary plus ordered round details', () => {
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
      roundNumber: 2,
      exitCode: 0,
      resultType: 'completed',
      lastMessage: 'done',
      durationMs: 2_000,
    });

    store.recordRound({
      taskId: task.taskId,
      roundNumber: 1,
      exitCode: 0,
      resultType: 'completed',
      lastMessage: 'working',
      durationMs: 1_000,
    });

    const snapshot = store.getTaskSnapshot(task.taskId);
    expect(snapshot.task.taskId).toBe(task.taskId);
    expect(snapshot.rounds.map((round) => round.roundNumber)).toEqual([1, 2]);
  });
});
