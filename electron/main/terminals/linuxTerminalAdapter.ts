import {
  type TerminalAdapter,
  type TerminalLaunchInput,
} from './terminalAdapter';

export class LinuxTerminalAdapter implements TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput) {
    return `x-terminal-emulator -e sh -lc 'cd "${input.cwd}" && ${input.runnerCommand}'`;
  }
}
