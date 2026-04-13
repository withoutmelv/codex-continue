import fs from 'node:fs';
import path from 'node:path';

type RoundRequest = {
  roundNumber: number;
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  timeoutMs: number;
};

export function ensureTaskDirectories(taskDir: string) {
  fs.mkdirSync(path.join(taskDir, 'requests'), { recursive: true });
  fs.mkdirSync(path.join(taskDir, 'results'), { recursive: true });
  fs.mkdirSync(path.join(taskDir, 'control'), { recursive: true });
}

export function writeRoundRequest(taskDir: string, request: RoundRequest) {
  ensureTaskDirectories(taskDir);
  fs.writeFileSync(
    path.join(taskDir, 'requests', `${request.roundNumber}.json`),
    JSON.stringify(request),
  );
}

export function readRoundRequest(taskDir: string, roundNumber: number): RoundRequest {
  return JSON.parse(
    fs.readFileSync(path.join(taskDir, 'requests', `${roundNumber}.json`), 'utf8'),
  ) as RoundRequest;
}

export function writeStopSignal(taskDir: string) {
  ensureTaskDirectories(taskDir);
  fs.writeFileSync(path.join(taskDir, 'control', 'stop'), '1');
}

export function removeTaskDirectory(taskDir: string) {
  fs.rmSync(taskDir, { recursive: true, force: true });
}
