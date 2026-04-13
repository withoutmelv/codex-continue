import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { app } from 'electron';
import { createTerminalAdapter } from '../terminals/factory';
import { parseCodexRound } from './codexEventParser';
import { writeRoundRequest, writeStopSignal } from './taskDirectories';
import { TaskOrchestrator } from './taskOrchestrator';
import { TaskStore } from './taskStore';

const execFileAsync = promisify(execFile);

type StartTaskInput = {
  taskId: string;
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  targetRounds: number;
  perRoundTimeoutMs: number;
};

export class TaskRuntime {
  private readonly activeOrchestrators = new Map<string, TaskOrchestrator>();

  constructor(private readonly store: TaskStore) {}

  async runTask(input: StartTaskInput) {
    const taskDir = path.join(os.tmpdir(), 'codex-continue', input.taskId);
    const adapter = createTerminalAdapter();
    const appRoot = process.cwd();
    const runnerEntry = app.isPackaged
      ? path.join(process.resourcesPath, 'dist-electron', 'runner', 'terminalRunner.js')
      : path.join(appRoot, 'electron', 'runner', 'terminalRunner.ts');
    const runnerCommand = app.isPackaged
      ? `node "${runnerEntry}" --task-dir "${taskDir}"`
      : `pnpm exec tsx "${runnerEntry}" --task-dir "${taskDir}"`;
    const launchSpec = adapter.buildLaunchCommand({
      taskId: input.taskId,
      cwd: appRoot,
      runnerCommand,
    });

    const orchestrator = new TaskOrchestrator({
      launchTerminal: async () => {
        await execFileAsync(launchSpec.command, launchSpec.args);
        this.store.setTerminalBinding(input.taskId, taskDir);
        return { terminalBinding: taskDir };
      },
      enqueueRound: async ({ roundNumber, terminalBinding, ...roundInput }) => {
        writeRoundRequest(terminalBinding, {
          roundNumber,
          sessionId: roundInput.sessionId,
          cwd: roundInput.cwd,
          fixedPrompt: roundInput.fixedPrompt,
          timeoutMs: roundInput.perRoundTimeoutMs,
        });

        const resultPath = path.join(terminalBinding, 'results', `${roundNumber}.json`);
        while (!fs.existsSync(resultPath)) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        const raw = JSON.parse(fs.readFileSync(resultPath, 'utf8')) as {
          exitCode: number;
          durationMs: number;
          output: string;
        };

        return parseCodexRound({
          lines: raw.output.split(/\r?\n/).filter(Boolean),
          exitCode: raw.exitCode,
          durationMs: raw.durationMs,
        });
      },
      updateTaskStatus: async (taskId, status) => {
        this.store.updateTaskStatus(taskId, status);
      },
      recordRound: async (payload) => {
        this.store.recordRound(payload);
      },
      markCompleted: async (taskId) => {
        this.store.markCompleted(taskId);
      },
      markFailed: async (taskId, reason) => {
        this.store.markFailed(taskId, reason);
      },
      markStopped: async (taskId) => {
        this.store.markStopped(taskId);
      },
    });

    this.activeOrchestrators.set(input.taskId, orchestrator);

    try {
      await orchestrator.run(input);
    } finally {
      this.activeOrchestrators.delete(input.taskId);
    }
  }

  async stopTask(taskId: string) {
    const taskDir = path.join(os.tmpdir(), 'codex-continue', taskId);
    writeStopSignal(taskDir);
    this.activeOrchestrators.get(taskId)?.stop(taskId);
    this.store.markStopped(taskId);
  }
}
