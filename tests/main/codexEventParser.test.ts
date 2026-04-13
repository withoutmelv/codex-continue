import { parseCodexRound } from '../../electron/main/services/codexEventParser';

describe('parseCodexRound', () => {
  it('treats turn.completed plus exit code 0 as a completed round', () => {
    const result = parseCodexRound({
      lines: [
        '{"type":"thread.started","thread_id":"1"}',
        '{"type":"turn.started"}',
        '{"type":"item.completed","item":{"type":"agent_message","text":"I will continue working."}}',
        '{"type":"turn.completed","usage":{"input_tokens":1}}',
      ],
      exitCode: 0,
      durationMs: 1000,
    });

    expect(result.completed).toBe(true);
    expect(result.resultType).toBe('completed');
    expect(result.lastMessage).toBe('I will continue working.');
  });

  it('ignores non-json lines before parsing codex events', () => {
    const result = parseCodexRound({
      lines: [
        'Reading additional input from stdin...',
        '{"type":"thread.started","thread_id":"1"}',
        '{"type":"turn.started"}',
        '{"type":"item.completed","item":{"type":"agent_message","text":"I am done with this round."}}',
        '{"type":"turn.completed","usage":{"input_tokens":1}}',
      ],
      exitCode: 0,
      durationMs: 1000,
    });

    expect(result.completed).toBe(true);
    expect(result.resultType).toBe('completed');
  });

  it('marks non-zero exits as failed even if a message exists', () => {
    const result = parseCodexRound({
      lines: [
        '{"type":"thread.started","thread_id":"1"}',
        '{"type":"turn.started"}',
        '{"type":"item.completed","item":{"type":"agent_message","text":"I hit an issue."}}',
      ],
      exitCode: 1,
      durationMs: 1000,
    });

    expect(result.completed).toBe(false);
    expect(result.resultType).toBe('process_error');
  });
});
