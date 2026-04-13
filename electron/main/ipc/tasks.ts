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
  getTaskSnapshot: (taskId: string) => Promise<unknown>;
};

export function createTaskHandlers(deps: TaskHandlersDeps) {
  return {
    start: async (input: StartTaskInput) => {
      const { taskId } = await deps.createTask(input);
      void deps.runTask({ ...input, taskId }).catch((error) => {
        console.error(`Managed task ${taskId} failed to run`, error);
      });
      return { taskId };
    },
    stop: async (taskId: string) => deps.stopTask(taskId),
    list: async () => deps.listActiveTasks(),
    getSnapshot: async (taskId: string) => deps.getTaskSnapshot(taskId),
  };
}
