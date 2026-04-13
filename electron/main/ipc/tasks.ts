type StartTaskInput = {
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  targetRounds: number;
  perRoundTimeoutMs: number;
};

type TaskHandlersDeps = {
  createTask: (input: StartTaskInput) => Promise<{ taskId: string }>;
  runTask: (input: StartTaskInput & { taskId: string }) => Promise<void>;
  stopTask: (taskId: string) => Promise<void>;
  listActiveTasks: () => Promise<unknown[]>;
};

export function createTaskHandlers(deps: TaskHandlersDeps) {
  return {
    start: async (input: StartTaskInput) => {
      const { taskId } = await deps.createTask(input);
      await deps.runTask({ ...input, taskId });
      return { taskId };
    },
    stop: async (taskId: string) => deps.stopTask(taskId),
    list: async () => deps.listActiveTasks(),
  };
}
