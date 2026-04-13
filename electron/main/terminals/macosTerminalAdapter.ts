import {
  type TerminalAdapter,
  type TerminalLaunchInput,
} from './terminalAdapter';

export class MacOsTerminalAdapter implements TerminalAdapter {
  buildOpenTerminalCommand(_input: TerminalLaunchInput) {
    return {
      command: 'osascript',
      args: [
        '-e',
        'tell application "Terminal" to do script ""',
      ],
    };
  }

  buildExecuteCommand(binding: string | null, shellCommand: string) {
    const escapedShellCommand = shellCommand.replace(/"/g, '\\"');
    return {
      command: 'osascript',
      args: [
        '-e',
        binding
          ? `tell application "Terminal" to do script "${escapedShellCommand}" in ${binding}`
          : `tell application "Terminal" to do script "${escapedShellCommand}"`,
      ],
    };
  }

  parseTerminalBinding(stdout: string) {
    const trimmed = stdout.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
