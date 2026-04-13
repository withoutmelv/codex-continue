import { MacOsTerminalAdapter } from '../../electron/main/terminals/macosTerminalAdapter';

describe('MacOsTerminalAdapter', () => {
  it('builds osascript specs for opening and reusing a terminal tab', () => {
    const adapter = new MacOsTerminalAdapter();
    const openSpec = adapter.buildOpenTerminalCommand({
      taskId: 'task-1',
      cwd: '/repo',
    });
    const runSpec = adapter.buildExecuteCommand(
      'tab 1 of window id 101',
      'codex exec resume "session" "prompt" --json',
    );

    expect(openSpec.command).toBe('osascript');
    expect(openSpec.args[0]).toBe('-e');
    expect(openSpec.args[1]).toContain('do script ""');

    expect(runSpec.command).toBe('osascript');
    expect(runSpec.args[1]).toContain('Terminal');
    expect(runSpec.args[1]).toContain('codex exec resume');
    expect(runSpec.args[1]).toContain('in tab 1 of window id 101');

    expect(adapter.parseTerminalBinding('tab 1 of window id 101\n')).toBe(
      'tab 1 of window id 101',
    );
  });
});
