import { LinuxTerminalAdapter } from '../../electron/main/terminals/linuxTerminalAdapter';

describe('LinuxTerminalAdapter', () => {
  it('builds an x-terminal-compatible launch spec', () => {
    const adapter = new LinuxTerminalAdapter();
    const spec = adapter.buildLaunchCommand({
      taskId: 'task-1',
      cwd: '/repo',
      runnerCommand: 'node /app/terminalRunner.js --task-dir /tmp/task-1',
    });

    expect(spec.command).toBe('x-terminal-emulator');
    expect(spec.args).toContain('-e');
    expect(spec.args).toContain('sh');
    expect(spec.args).toContain('-lc');
    expect(spec.args.at(-1)).toContain('terminalRunner.js');
  });
});
