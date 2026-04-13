import { buildRoundShellCommand } from '../../electron/runner/buildRoundShellCommand';

describe('buildRoundShellCommand', () => {
  it('builds a visible codex exec resume shell command with output teeing', () => {
    const shellCommand = buildRoundShellCommand({
      sessionId: '019d8010-6f12-7912-8f9b-8dcc7ea02a8e',
      cwd: '/Users/withoutmelv/work/weather-card',
      fixedPrompt: '我要出去了，按照你的建议继续做',
      outputFile: '/tmp/codex-continue/1.output.log',
    });

    expect(shellCommand).toContain('codex exec resume');
    expect(shellCommand).toContain('--json');
    expect(shellCommand).toContain('--skip-git-repo-check');
    expect(shellCommand).toContain('tee');
    expect(shellCommand).toContain('/tmp/codex-continue/1.output.log');
  });
});
