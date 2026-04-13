import {
  type TerminalAdapter,
  type TerminalLaunchInput,
} from './terminalAdapter';

export class LinuxTerminalAdapter implements TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput) {
    return {
      command: 'x-terminal-emulator',
      args: ['-e', 'sh', '-lc', `cd "${input.cwd}" && ${input.runnerCommand}`],
    };
  }
}
