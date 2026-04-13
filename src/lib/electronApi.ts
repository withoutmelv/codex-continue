import { listSessionsResponseSchema } from '../shared/schemas';

declare global {
  interface Window {
    electronApi: {
      listSessions: () => Promise<unknown>;
    };
  }
}

export async function listSessions() {
  return listSessionsResponseSchema.parse(await window.electronApi.listSessions());
}
