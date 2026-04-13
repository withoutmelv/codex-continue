import os from 'node:os';
import path from 'node:path';
import { TaskRuntime } from '../../electron/main/services/taskRuntime';

describe('TaskRuntime cleanup', () => {
  it('cleans up the task temp directory after runTask settles', async () => {
    const removedDirs: string[] = [];

    const runtime = new TaskRuntime(
      {
        setTerminalBinding: () => undefined,
        updateTaskStatus: () => undefined,
        recordRound: () => undefined,
        markCompleted: () => undefined,
        markFailed: () => undefined,
        markStopped: () => undefined,
      } as never,
      {
        removeTaskDirectory: (taskDir: string) => {
          removedDirs.push(taskDir);
        },
        createTaskOrchestrator: () => ({
          run: async () => undefined,
          stop: () => undefined,
        }),
      } as never,
    );

    await runtime.runTask({
      taskId: 'task-123',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue',
      targetRounds: 1,
      perRoundTimeoutMs: 1000,
    });

    expect(removedDirs).toEqual([
      path.join(os.tmpdir(), 'codex-continue', 'task-123'),
    ]);
  });
});
