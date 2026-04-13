import { MacOsTerminalAdapter } from '../../electron/main/terminals/macosTerminalAdapter';

describe('MacOsTerminalAdapter', () => {
  it('builds an osascript command that runs the terminal runner', () => {
    const adapter = new MacOsTerminalAdapter();
    const command = adapter.buildLaunchCommand({
      taskId: 'task-1',
      cwd: '/repo',
      runnerCommand: 'node /app/terminalRunner.js --task-dir /tmp/task-1',
    });

    expect(command).toContain('osascript');
    expect(command).toContain('Terminal');
    expect(command).toContain('terminalRunner.js');
  });
});
