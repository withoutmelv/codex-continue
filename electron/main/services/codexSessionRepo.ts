import Database from 'better-sqlite3';
import os from 'node:os';
import path from 'node:path';
import { type SessionSummary } from '../../../src/shared/schemas';

type ThreadRow = {
  id: string;
  title: string;
  cwd: string;
  rollout_path: string;
  updated_at: number;
};

export class CodexSessionRepo {
  constructor(
    private readonly dbPath = path.join(os.homedir(), '.codex', 'state_5.sqlite'),
  ) {}

  listSessions(): SessionSummary[] {
    const db = new Database(this.dbPath, { readonly: true });
    const rows = db
      .prepare(
        `
          select id, title, cwd, rollout_path, updated_at
          from threads
          where archived = 0
          order by updated_at desc
        `,
      )
      .all() as ThreadRow[];

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      cwd: row.cwd,
      rolloutPath: row.rollout_path,
      updatedAt: row.updated_at,
    }));
  }
}
