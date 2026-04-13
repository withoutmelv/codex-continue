import { TaskOrchestrator } from '../../electron/main/services/taskOrchestrator';

describe('TaskOrchestrator', () => {
  it('runs rounds serially until the target count is reached', async () => {
    const executed: number[] = [];

    const orchestrator = new TaskOrchestrator({
      launchTerminal: async () => ({ terminalBinding: 'terminal-1' }),
      enqueueRound: async ({ roundNumber }) => {
        executed.push(roundNumber);
        return {
          completed: true,
          exitCode: 0,
          resultType: 'STATUS: RETRY',
          lastMessage: 'STATUS: RETRY',
          durationMs: 1000,
        };
      },
      markFailed: async () => undefined,
      markCompleted: async () => undefined,
      markStopped: async () => undefined,
      recordRound: async () => undefined,
      updateTaskStatus: async () => undefined,
    });

    await orchestrator.run({
      taskId: 'task-1',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      targetRounds: 3,
      perRoundTimeoutMs: 1000,
    });

    expect(executed).toEqual([1, 2, 3]);
  });

  it('stops before scheduling the next round when requested', async () => {
    const executed: number[] = [];

    const orchestrator = new TaskOrchestrator({
      launchTerminal: async () => ({ terminalBinding: 'terminal-1' }),
      enqueueRound: async ({ roundNumber }) => {
        executed.push(roundNumber);
        if (roundNumber === 1) {
          orchestrator.stop('task-stop');
        }

        return {
          completed: true,
          exitCode: 0,
          resultType: 'STATUS: RETRY',
          lastMessage: 'STATUS: RETRY',
          durationMs: 1000,
        };
      },
      markFailed: async () => undefined,
      markCompleted: async () => undefined,
      markStopped: async () => undefined,
      recordRound: async () => undefined,
      updateTaskStatus: async () => undefined,
    });

    await orchestrator.run({
      taskId: 'task-stop',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      targetRounds: 3,
      perRoundTimeoutMs: 1000,
    });

    expect(executed).toEqual([1]);
  });
});
