import { MacOsTerminalAdapter } from '../../electron/main/terminals/macosTerminalAdapter';

describe('MacOsTerminalAdapter', () => {
  it('builds an osascript launch spec that preserves the runner command', () => {
    const adapter = new MacOsTerminalAdapter();
    const spec = adapter.buildLaunchCommand({
      taskId: 'task-1',
      cwd: '/repo',
      runnerCommand: 'node /app/terminalRunner.js --task-dir /tmp/task-1',
    });

    expect(spec.command).toBe('osascript');
    expect(spec.args[0]).toBe('-e');
    expect(spec.args[1]).toContain('Terminal');
    expect(spec.args[1]).toContain('terminalRunner.js');
    expect(spec.args[1]).toContain('--task-dir /tmp/task-1');
  });
});
