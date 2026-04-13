type RunInput = {
  taskId: string;
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  targetRounds: number;
  perRoundTimeoutMs: number;
};

type RoundResult = {
  completed: boolean;
  exitCode: number;
  resultType: string;
  lastMessage: string;
  durationMs: number;
};

type TaskOrchestratorDeps = {
  launchTerminal: (input: RunInput) => Promise<{ terminalBinding: string }>;
  enqueueRound: (
    input: RunInput & { roundNumber: number; terminalBinding: string },
  ) => Promise<RoundResult>;
  updateTaskStatus: (taskId: string, status: string) => Promise<void>;
  recordRound: (input: {
    taskId: string;
    roundNumber: number;
    exitCode: number;
    resultType: string;
    lastMessage: string;
    durationMs: number;
  }) => Promise<void>;
  markCompleted: (taskId: string) => Promise<void>;
  markFailed: (taskId: string, reason: string) => Promise<void>;
  markStopped: (taskId: string) => Promise<void>;
};

export class TaskOrchestrator {
  private readonly stoppedTasks = new Set<string>();

  constructor(private readonly deps: TaskOrchestratorDeps) {}

  stop(taskId: string) {
    this.stoppedTasks.add(taskId);
  }

  async run(input: RunInput) {
    await this.deps.updateTaskStatus(input.taskId, 'LaunchingTerminal');
    const { terminalBinding } = await this.deps.launchTerminal(input);

    for (let roundNumber = 1; roundNumber <= input.targetRounds; roundNumber += 1) {
      if (this.stoppedTasks.has(input.taskId)) {
        await this.deps.markStopped(input.taskId);
        return;
      }

      await this.deps.updateTaskStatus(input.taskId, 'RunningRound');

      const result = await this.deps.enqueueRound({
        ...input,
        roundNumber,
        terminalBinding,
      });

      if (!result.completed) {
        if (this.stoppedTasks.has(input.taskId)) {
          await this.deps.markStopped(input.taskId);
          return;
        }

        await this.deps.markFailed(input.taskId, result.resultType);
        return;
      }

      await this.deps.recordRound({
        taskId: input.taskId,
        roundNumber,
        exitCode: result.exitCode,
        resultType: result.resultType,
        lastMessage: result.lastMessage,
        durationMs: result.durationMs,
      });

      if (this.stoppedTasks.has(input.taskId)) {
        await this.deps.markStopped(input.taskId);
        return;
      }

      await this.deps.updateTaskStatus(input.taskId, 'RoundFinished');
    }

    await this.deps.markCompleted(input.taskId);
  }
}
