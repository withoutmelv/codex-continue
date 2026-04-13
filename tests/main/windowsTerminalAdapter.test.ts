import { WindowsTerminalAdapter } from '../../electron/main/terminals/windowsTerminalAdapter';

describe('WindowsTerminalAdapter', () => {
  it('builds a wt launch spec', () => {
    const adapter = new WindowsTerminalAdapter();
    const spec = adapter.buildOpenTerminalCommand({
      taskId: 'task-1',
      cwd: 'C:/repo',
    });
    const runSpec = adapter.buildExecuteCommand(
      null,
      'codex exec resume "session" "prompt" --json',
    );

    expect(spec.command).toBe('wt');
    expect(spec.args).toContain('-d');
    expect(spec.args).toContain('C:/repo');
    expect(runSpec.args.join(' ')).toContain('codex exec resume');
  });
});
