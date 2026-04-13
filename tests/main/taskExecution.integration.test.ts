import { createTaskHandlers } from '../../electron/main/ipc/tasks';

describe('task execution integration', () => {
  it('creates a task and schedules runTask in the background', async () => {
    const calls: string[] = [];
    let releaseRunTask: (() => void) | null = null;

    const handlers = createTaskHandlers({
      createTask: async () => ({ taskId: 'task-1' }),
      runTask: async () => {
        calls.push('runTask');
        await new Promise<void>((resolve) => {
          releaseRunTask = resolve;
        });
      },
      stopTask: async () => {
        calls.push('stopTask');
      },
      listActiveTasks: async () => [],
    });

    const pending = Symbol('pending');
    const startResult = await Promise.race([
      handlers.start({
        sessionId: 'session-1',
        cwd: '/repo',
        fixedPrompt: 'Continue the task',
        targetRounds: 2,
        perRoundTimeoutMs: 1000,
      }),
      new Promise((resolve) => setTimeout(() => resolve(pending), 10)),
    ]);

    expect(startResult).toEqual({
      taskId: 'task-1',
    });

    expect(calls).toEqual(['runTask']);
    const finishRunTask = releaseRunTask as (() => void) | null;
    if (finishRunTask) {
      finishRunTask();
    }
  });
});
