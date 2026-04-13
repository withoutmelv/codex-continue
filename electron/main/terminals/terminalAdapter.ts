export interface TerminalLaunchInput {
  taskId: string;
  cwd: string;
  runnerCommand: string;
}

export interface TerminalLaunchSpec {
  command: string;
  args: string[];
}

export interface TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput): TerminalLaunchSpec;
}
