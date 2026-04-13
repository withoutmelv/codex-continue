import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  type ManagedTask,
  type ManagedTaskRound,
} from '../../../src/shared/schemas';

type CreateTaskInput = {
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  targetRounds: number;
  perRoundTimeoutMs: number;
};

export class TaskStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      create table if not exists managed_tasks (
        task_id text primary key,
        session_id text not null,
        cwd text not null,
        fixed_prompt text not null,
        target_rounds integer not null,
        completed_rounds integer not null,
        per_round_timeout_ms integer not null,
        terminal_binding text,
        status text not null,
        last_exit_code integer,
        last_status_text text,
        started_at integer not null,
        updated_at integer not null
      );

      create table if not exists managed_task_rounds (
        round_id text primary key,
        task_id text not null,
        round_number integer not null,
        exit_code integer not null,
        result_type text not null,
        last_message text not null,
        duration_ms integer not null,
        started_at integer not null,
        finished_at integer not null
      );
    `);
  }

  createTask(input: CreateTaskInput) {
    const now = Date.now();
    const taskId = crypto.randomUUID();

    this.db
      .prepare(`
        insert into managed_tasks (
          task_id, session_id, cwd, fixed_prompt, target_rounds, completed_rounds,
          per_round_timeout_ms, terminal_binding, status, last_exit_code, last_status_text, started_at, updated_at
        ) values (?, ?, ?, ?, ?, 0, ?, null, 'LaunchingTerminal', null, null, ?, ?)
      `)
      .run(
        taskId,
        input.sessionId,
        input.cwd,
        input.fixedPrompt,
        input.targetRounds,
        input.perRoundTimeoutMs,
        now,
        now,
      );

    return {
      taskId,
      ...input,
      completedRounds: 0,
      terminalBinding: null,
      status: 'LaunchingTerminal' as const,
      lastExitCode: null,
      lastStatusText: null,
      startedAt: now,
      updatedAt: now,
    };
  }

  recordRound(input: {
    taskId: string;
    roundNumber: number;
    exitCode: number;
    resultType: string;
    lastMessage: string;
    durationMs: number;
  }) {
    const now = Date.now();
    this.db
      .prepare(`
        insert into managed_task_rounds (
          round_id, task_id, round_number, exit_code, result_type, last_message, duration_ms, started_at, finished_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        crypto.randomUUID(),
        input.taskId,
        input.roundNumber,
        input.exitCode,
        input.resultType,
        input.lastMessage,
        input.durationMs,
        now - input.durationMs,
        now,
      );

    this.db
      .prepare(`
        update managed_tasks
        set completed_rounds = completed_rounds + 1,
            last_exit_code = ?,
            last_status_text = ?,
            updated_at = ?
        where task_id = ?
      `)
      .run(input.exitCode, input.resultType, now, input.taskId);
  }

  updateTaskStatus(taskId: string, status: string) {
    this.db
      .prepare(`
        update managed_tasks
        set status = ?, updated_at = ?
        where task_id = ?
      `)
      .run(status, Date.now(), taskId);
  }

  setTerminalBinding(taskId: string, terminalBinding: string | null) {
    this.db
      .prepare(`
        update managed_tasks
        set terminal_binding = ?, updated_at = ?
        where task_id = ?
      `)
      .run(terminalBinding, Date.now(), taskId);
  }

  markCompleted(taskId: string) {
    this.updateTaskStatus(taskId, 'Completed');
  }

  markFailed(taskId: string, reason: string) {
    this.db
      .prepare(`
        update managed_tasks
        set status = 'Failed',
            last_status_text = ?,
            updated_at = ?
        where task_id = ?
      `)
      .run(reason, Date.now(), taskId);
  }

  markStopped(taskId: string) {
    this.updateTaskStatus(taskId, 'Stopped');
  }

  getTaskSnapshot(taskId: string): {
    task: ManagedTask;
    rounds: ManagedTaskRound[];
  } {
    const task = this.db
      .prepare(`
        select
          task_id as taskId,
          session_id as sessionId,
          cwd,
          fixed_prompt as fixedPrompt,
          target_rounds as targetRounds,
          completed_rounds as completedRounds,
          per_round_timeout_ms as perRoundTimeoutMs,
          terminal_binding as terminalBinding,
          status,
          last_exit_code as lastExitCode,
          last_status_text as lastStatusText,
          started_at as startedAt,
          updated_at as updatedAt
        from managed_tasks
        where task_id = ?
      `)
      .get(taskId) as ManagedTask;

    const rounds = this.db
      .prepare(`
        select
          task_id as taskId,
          round_number as roundNumber,
          exit_code as exitCode,
          result_type as resultType,
          last_message as lastMessage,
          duration_ms as durationMs,
          started_at as startedAt,
          finished_at as finishedAt
        from managed_task_rounds
        where task_id = ?
        order by round_number asc
      `)
      .all(taskId) as ManagedTaskRound[];

    return { task, rounds };
  }

  listActiveTasks() {
    return this.db
      .prepare(`
        select
          task_id as taskId,
          session_id as sessionId,
          cwd,
          fixed_prompt as fixedPrompt,
          target_rounds as targetRounds,
          completed_rounds as completedRounds,
          per_round_timeout_ms as perRoundTimeoutMs,
          terminal_binding as terminalBinding,
          status,
          last_exit_code as lastExitCode,
          last_status_text as lastStatusText,
          started_at as startedAt,
          updated_at as updatedAt
        from managed_tasks
        where status in ('LaunchingTerminal', 'RunningRound', 'RoundFinished')
        order by updated_at desc
      `)
      .all();
  }
}
