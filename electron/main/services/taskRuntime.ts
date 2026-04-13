import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createTerminalAdapter } from '../terminals/factory';
import { buildRoundShellCommand } from './buildRoundShellCommand';
import { parseCodexRound } from './codexEventParser';
import { ensureTaskDirectories } from './taskDirectories';
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
    ensureTaskDirectories(taskDir);

    const launchSpec = adapter.buildOpenTerminalCommand({
      taskId: input.taskId,
      cwd: appRoot,
    });

    const orchestrator = new TaskOrchestrator({
      launchTerminal: async () => {
        const { stdout } = await execFileAsync(launchSpec.command, launchSpec.args);
        const terminalBinding = adapter.parseTerminalBinding(stdout);
        this.store.setTerminalBinding(input.taskId, terminalBinding);
        return { terminalBinding };
      },
      enqueueRound: async ({ roundNumber, terminalBinding, ...roundInput }) => {
        const startedAt = Date.now();
        const outputFile = path.join(taskDir, 'results', `${roundNumber}.output.log`);
        const exitCodeFile = path.join(taskDir, 'results', `${roundNumber}.exit.txt`);
        const doneFile = path.join(taskDir, 'results', `${roundNumber}.done`);
        const pidFile = path.join(taskDir, 'results', `${roundNumber}.pid`);
        const shellCommand = buildRoundShellCommand({
          sessionId: roundInput.sessionId,
          cwd: roundInput.cwd,
          fixedPrompt: roundInput.fixedPrompt,
          outputFile,
          exitCodeFile,
          doneFile,
          pidFile,
        });
        const executeSpec = adapter.buildExecuteCommand(terminalBinding, shellCommand);
        await execFileAsync(executeSpec.command, executeSpec.args);

        const deadline = Date.now() + roundInput.perRoundTimeoutMs;
        while (!fs.existsSync(doneFile)) {
          if (Date.now() > deadline) {
            if (fs.existsSync(pidFile)) {
              const pid = Number(fs.readFileSync(pidFile, 'utf8'));
              if (!Number.isNaN(pid)) {
                process.kill(pid, 'SIGTERM');
              }
            }
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        const output = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf8') : '';
        const exitCode = fs.existsSync(exitCodeFile)
          ? Number(fs.readFileSync(exitCodeFile, 'utf8'))
          : 1;
        const durationMs = Date.now() - startedAt;

        return parseCodexRound({
          lines: output.split(/\r?\n/).filter(Boolean),
          exitCode,
          durationMs,
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
    const resultsDir = path.join(taskDir, 'results');
    const latestPidFile = fs.existsSync(resultsDir)
      ? fs
          .readdirSync(resultsDir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith('.pid'))
          .sort((a, b) => a.name.localeCompare(b.name))
          .at(-1)
      : undefined;

    if (latestPidFile) {
      const pid = Number(
        fs.readFileSync(path.join(resultsDir, latestPidFile.name), 'utf8'),
      );
      if (!Number.isNaN(pid)) {
        process.kill(pid, 'SIGTERM');
      }
    }

    this.activeOrchestrators.get(taskId)?.stop(taskId);
    this.store.markStopped(taskId);
  }
}
