import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { buildRoundShellCommand } from './buildRoundShellCommand';

const taskDir = process.argv[process.argv.indexOf('--task-dir') + 1];

async function runLoop() {
  const seen = new Set<string>();

  while (true) {
    const requestDir = path.join(taskDir, 'requests');
    const files = fs.existsSync(requestDir)
      ? fs.readdirSync(requestDir).sort()
      : [];

    for (const file of files) {
      if (seen.has(file)) {
        continue;
      }

      seen.add(file);

      const request = JSON.parse(
        fs.readFileSync(path.join(requestDir, file), 'utf8'),
      ) as {
        roundNumber: number;
        sessionId: string;
        cwd: string;
        fixedPrompt: string;
        timeoutMs: number;
      };

      const startedAt = Date.now();
      const outputFile = path.join(taskDir, 'results', `${request.roundNumber}.output.log`);
      const shellCommand = buildRoundShellCommand({
        sessionId: request.sessionId,
        cwd: request.cwd,
        fixedPrompt: request.fixedPrompt,
        outputFile,
      });
      const child = spawn('/bin/bash', ['-lc', shellCommand], {
        cwd: request.cwd,
        stdio: 'inherit',
        detached: true,
      });

      let timedOut = false;
      let stopped = false;

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        process.kill(-child.pid!, 'SIGTERM');
      }, request.timeoutMs);

      const stopHandle = setInterval(() => {
        if (fs.existsSync(path.join(taskDir, 'control', 'stop'))) {
          stopped = true;
          process.kill(-child.pid!, 'SIGTERM');
        }
      }, 200);

      const exitCode = await new Promise<number>((resolve) =>
        child.on('close', (code) => resolve(code ?? 1)),
      );

      clearTimeout(timeoutHandle);
      clearInterval(stopHandle);
      const combined = fs.existsSync(outputFile)
        ? fs.readFileSync(outputFile, 'utf8')
        : '';

      fs.writeFileSync(
        path.join(taskDir, 'results', `${request.roundNumber}.json`),
        JSON.stringify({
          roundNumber: request.roundNumber,
          exitCode,
          timedOut,
          stopped,
          durationMs: Date.now() - startedAt,
          output: combined,
        }),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

void runLoop();
