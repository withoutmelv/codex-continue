import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

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

      const args = [
        'exec',
        'resume',
        request.sessionId,
        request.fixedPrompt,
        '--json',
        '--skip-git-repo-check',
      ];
      const startedAt = Date.now();
      const child = spawn('codex', args, {
        cwd: request.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let combined = '';
      let timedOut = false;
      let stopped = false;

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, request.timeoutMs);

      const stopHandle = setInterval(() => {
        if (fs.existsSync(path.join(taskDir, 'control', 'stop'))) {
          stopped = true;
          child.kill('SIGTERM');
        }
      }, 200);

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        process.stdout.write(text);
        combined += text;
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        process.stderr.write(text);
        combined += text;
      });

      const exitCode = await new Promise<number>((resolve) =>
        child.on('close', (code) => resolve(code ?? 1)),
      );

      clearTimeout(timeoutHandle);
      clearInterval(stopHandle);

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
