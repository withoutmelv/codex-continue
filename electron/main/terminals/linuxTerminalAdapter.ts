import {
  type TerminalAdapter,
  type TerminalLaunchInput,
} from './terminalAdapter';

export class LinuxTerminalAdapter implements TerminalAdapter {
  buildOpenTerminalCommand(input: TerminalLaunchInput) {
    return {
      command: 'x-terminal-emulator',
      args: ['-e', 'sh', '-lc', `cd "${input.cwd}" && exec "$SHELL"`],
    };
  }

  buildExecuteCommand(_binding: string | null, shellCommand: string) {
    return {
      command: 'x-terminal-emulator',
      args: ['-e', 'sh', '-lc', shellCommand],
    };
  }

  parseTerminalBinding(_stdout: string) {
    return null;
  }
}
