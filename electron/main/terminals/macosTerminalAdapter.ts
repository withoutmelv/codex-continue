import {
  type TerminalAdapter,
  type TerminalLaunchInput,
} from './terminalAdapter';

export class MacOsTerminalAdapter implements TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput) {
    return {
      command: 'osascript',
      args: [
        '-e',
        `tell application "Terminal" to do script "cd ${input.cwd} && ${input.runnerCommand}"`,
      ],
    };
  }
}
