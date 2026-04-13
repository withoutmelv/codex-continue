export interface TerminalLaunchInput {
  taskId: string;
  cwd: string;
}

export interface TerminalLaunchSpec {
  command: string;
  args: string[];
}

export interface TerminalAdapter {
  buildOpenTerminalCommand(input: TerminalLaunchInput): TerminalLaunchSpec;
  buildExecuteCommand(
    binding: string | null,
    shellCommand: string,
  ): TerminalLaunchSpec;
  parseTerminalBinding(stdout: string): string | null;
}
