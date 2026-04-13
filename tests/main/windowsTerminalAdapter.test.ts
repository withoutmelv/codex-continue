import { WindowsTerminalAdapter } from '../../electron/main/terminals/windowsTerminalAdapter';

describe('WindowsTerminalAdapter', () => {
  it('builds a wt launch command', () => {
    const adapter = new WindowsTerminalAdapter();
    const command = adapter.buildLaunchCommand({
      taskId: 'task-1',
      cwd: 'C:/repo',
      runnerCommand: 'node C:/app/terminalRunner.js --task-dir C:/tmp/task-1',
    });

    expect(command).toContain('wt');
    expect(command).toContain('terminalRunner.js');
  });
});
