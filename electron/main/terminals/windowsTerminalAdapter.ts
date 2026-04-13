import {
  type TerminalAdapter,
  type TerminalLaunchInput,
} from './terminalAdapter';

export class WindowsTerminalAdapter implements TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput) {
    return {
      command: 'wt',
      args: ['-d', input.cwd, 'pwsh', '-NoExit', '-Command', input.runnerCommand],
    };
  }
}
