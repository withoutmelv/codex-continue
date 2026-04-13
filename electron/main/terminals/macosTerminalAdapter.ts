import { type TerminalAdapter, type TerminalLaunchInput } from './terminalAdapter';

export class MacOsTerminalAdapter implements TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput) {
    const escapedCommand = input.runnerCommand.replace(/"/g, '\\"');
    return [
      'osascript',
      '-e',
      `"tell application \\"Terminal\\" to do script \\"cd ${input.cwd} && ${escapedCommand}\\""`,
    ].join(' ');
  }
}
