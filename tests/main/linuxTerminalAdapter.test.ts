import { LinuxTerminalAdapter } from '../../electron/main/terminals/linuxTerminalAdapter';

describe('LinuxTerminalAdapter', () => {
  it('builds an x-terminal-compatible command', () => {
    const adapter = new LinuxTerminalAdapter();
    const command = adapter.buildLaunchCommand({
      taskId: 'task-1',
      cwd: '/repo',
      runnerCommand: 'node /app/terminalRunner.js --task-dir /tmp/task-1',
    });

    expect(command).toContain('sh -lc');
  });
});
