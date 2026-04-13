import { createTaskHandlers } from '../../electron/main/ipc/tasks';

describe('task execution integration', () => {
  it('creates a task and schedules round 1', async () => {
    const calls: string[] = [];

    const handlers = createTaskHandlers({
      createTask: async () => ({ taskId: 'task-1' }),
      runTask: async () => {
        calls.push('runTask');
      },
      stopTask: async () => {
        calls.push('stopTask');
      },
      listActiveTasks: async () => [],
    });

    await handlers.start({
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      targetRounds: 2,
      perRoundTimeoutMs: 1000,
    });

    expect(calls).toEqual(['runTask']);
  });
});
