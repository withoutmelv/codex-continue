import { WindowsTerminalAdapter } from '../../electron/main/terminals/windowsTerminalAdapter';

describe('WindowsTerminalAdapter', () => {
  it('builds a wt launch spec', () => {
    const adapter = new WindowsTerminalAdapter();
    const spec = adapter.buildLaunchCommand({
      taskId: 'task-1',
      cwd: 'C:/repo',
      runnerCommand: 'node C:/app/terminalRunner.js --task-dir C:/tmp/task-1',
    });

    expect(spec.command).toBe('wt');
    expect(spec.args).toContain('-d');
    expect(spec.args).toContain('C:/repo');
    expect(spec.args.join(' ')).toContain('terminalRunner.js');
  });
});
