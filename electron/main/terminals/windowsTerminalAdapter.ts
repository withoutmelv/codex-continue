import {
  type TerminalAdapter,
  type TerminalLaunchInput,
} from './terminalAdapter';

export class WindowsTerminalAdapter implements TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput) {
    return `wt -d "${input.cwd}" pwsh -NoExit -Command "${input.runnerCommand}"`;
  }
}
