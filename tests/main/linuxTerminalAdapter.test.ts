import { LinuxTerminalAdapter } from '../../electron/main/terminals/linuxTerminalAdapter';

describe('LinuxTerminalAdapter', () => {
  it('builds an x-terminal-compatible launch spec', () => {
    const adapter = new LinuxTerminalAdapter();
    const spec = adapter.buildOpenTerminalCommand({
      taskId: 'task-1',
      cwd: '/repo',
    });
    const runSpec = adapter.buildExecuteCommand(
      null,
      'codex exec resume "session" "prompt" --json',
    );

    expect(spec.command).toBe('x-terminal-emulator');
    expect(spec.args).toContain('-e');
    expect(spec.args).toContain('sh');
    expect(spec.args).toContain('-lc');
    expect(runSpec.args.at(-1)).toContain('codex exec resume');
  });
});
