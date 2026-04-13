export interface TerminalLaunchInput {
  taskId: string;
  cwd: string;
  runnerCommand: string;
}

export interface TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput): string;
}
