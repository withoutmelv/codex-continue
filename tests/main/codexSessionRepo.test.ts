import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CodexSessionRepo } from '../../electron/main/services/codexSessionRepo';

describe('CodexSessionRepo', () => {
  it('returns non-archived sessions sorted by updated_at desc', () => {
    const dbPath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sessions-')),
      'state.sqlite',
    );
    const db = new DatabaseSync(dbPath);

    db.exec(`
      create table threads (
        id text primary key,
        rollout_path text not null,
        created_at integer not null,
        updated_at integer not null,
        source text not null,
        model_provider text not null,
        cwd text not null,
        title text not null,
        sandbox_policy text not null,
        approval_mode text not null,
        tokens_used integer not null default 0,
        has_user_event integer not null default 0,
        archived integer not null default 0
      );
    `);

    db.prepare(`
      insert into threads (id, rollout_path, created_at, updated_at, source, model_provider, cwd, title, sandbox_policy, approval_mode, archived)
      values (?, ?, ?, ?, 'exec', 'openai', ?, ?, 'workspace-write', 'never', ?)
    `).run('old', '/tmp/old.jsonl', 1, 10, '/repo/old', 'Old Session', 0);

    db.prepare(`
      insert into threads (id, rollout_path, created_at, updated_at, source, model_provider, cwd, title, sandbox_policy, approval_mode, archived)
      values (?, ?, ?, ?, 'exec', 'openai', ?, ?, 'workspace-write', 'never', ?)
    `).run('new', '/tmp/new.jsonl', 1, 20, '/repo/new', 'New Session', 0);

    db.prepare(`
      insert into threads (id, rollout_path, created_at, updated_at, source, model_provider, cwd, title, sandbox_policy, approval_mode, archived)
      values (?, ?, ?, ?, 'exec', 'openai', ?, ?, 'workspace-write', 'never', ?)
    `).run(
      'archived',
      '/tmp/a.jsonl',
      1,
      30,
      '/repo/a',
      'Archived Session',
      1,
    );

    const repo = new CodexSessionRepo(dbPath);

    expect(repo.listSessions().map((session) => session.id)).toEqual([
      'new',
      'old',
    ]);
  });
});
