import {
  getSessionTranscriptResponseSchema,
  listSessionsResponseSchema,
  listTasksResponseSchema,
  startTaskResponseSchema,
  taskSnapshotResponseSchema,
} from '../shared/schemas';

declare global {
  interface Window {
    electronApi: {
      listSessions: () => Promise<unknown>;
      getSessionTranscript: (rolloutPath: string) => Promise<unknown>;
      startTask: (input: unknown) => Promise<unknown>;
      stopTask: (taskId: string) => Promise<unknown>;
      listTasks: () => Promise<unknown>;
      getTaskSnapshot: (taskId: string) => Promise<unknown>;
    };
  }
}

function getElectronApi() {
  return window.electronApi;
}

export async function listSessions() {
  const api = getElectronApi();
  if (!api) {
    return listSessionsResponseSchema.parse({ sessions: [] });
  }

  return listSessionsResponseSchema.parse(await api.listSessions());
}

export async function getSessionTranscript(rolloutPath: string) {
  const api = getElectronApi();
  if (!api) {
    return getSessionTranscriptResponseSchema.parse({ entries: [] });
  }

  return getSessionTranscriptResponseSchema.parse(
    await api.getSessionTranscript(rolloutPath),
  );
}

export async function startTask(input: unknown) {
  const api = getElectronApi();
  if (!api) {
    throw new Error('electronApi.startTask is unavailable');
  }

  return startTaskResponseSchema.parse(await api.startTask(input));
}

export async function stopTask(taskId: string) {
  const api = getElectronApi();
  if (!api) {
    return undefined;
  }

  return api.stopTask(taskId);
}

export async function listTasks() {
  const api = getElectronApi();
  if (!api) {
    return listTasksResponseSchema.parse([]);
  }

  return listTasksResponseSchema.parse(await api.listTasks());
}

export async function getTaskSnapshot(taskId: string) {
  const api = getElectronApi();
  if (!api) {
    throw new Error('electronApi.getTaskSnapshot is unavailable');
  }

  return taskSnapshotResponseSchema.parse(await api.getTaskSnapshot(taskId));
}
