import { parseCodexRound } from '../../electron/main/services/codexEventParser';

describe('parseCodexRound', () => {
  it('requires turn.completed and extracts the final status marker', () => {
    const result = parseCodexRound({
      lines: [
        '{"type":"thread.started","thread_id":"1"}',
        '{"type":"turn.started"}',
        '{"type":"item.completed","item":{"type":"agent_message","text":"STATUS: RETRY"}}',
        '{"type":"turn.completed","usage":{"input_tokens":1}}',
      ],
      exitCode: 0,
      durationMs: 1000,
    });

    expect(result.completed).toBe(true);
    expect(result.resultType).toBe('STATUS: RETRY');
  });

  it('ignores non-json lines before parsing codex events', () => {
    const result = parseCodexRound({
      lines: [
        'Reading additional input from stdin...',
        '{"type":"thread.started","thread_id":"1"}',
        '{"type":"turn.started"}',
        '{"type":"item.completed","item":{"type":"agent_message","text":"STATUS: DONE"}}',
        '{"type":"turn.completed","usage":{"input_tokens":1}}',
      ],
      exitCode: 0,
      durationMs: 1000,
    });

    expect(result.completed).toBe(true);
    expect(result.resultType).toBe('STATUS: DONE');
  });
});
