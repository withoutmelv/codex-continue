import {
  type TerminalAdapter,
  type TerminalLaunchInput,
} from './terminalAdapter';

export class WindowsTerminalAdapter implements TerminalAdapter {
  buildOpenTerminalCommand(input: TerminalLaunchInput) {
    return {
      command: 'wt',
      args: ['-d', input.cwd],
    };
  }

  buildExecuteCommand(_binding: string | null, shellCommand: string) {
    return {
      command: 'wt',
      args: ['pwsh', '-NoExit', '-Command', shellCommand],
    };
  }

  parseTerminalBinding(_stdout: string) {
    return null;
  }
}
