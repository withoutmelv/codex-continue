import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readSessionTranscript } from '../../electron/main/services/sessionTranscriptParser';

describe('readSessionTranscript', () => {
  it('extracts readable user and assistant messages from rollout jsonl', () => {
    const filePath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'codex-transcript-')),
      'rollout.jsonl',
    );

    fs.writeFileSync(
      filePath,
      [
        JSON.stringify({
          timestamp: '2026-04-13T08:34:36.000Z',
          type: 'event_msg',
          payload: { type: 'user_message', message: '我要出去了，按照你的建议继续做' },
        }),
        JSON.stringify({
          timestamp: '2026-04-13T08:35:00.000Z',
          type: 'event_msg',
          payload: { type: 'agent_message', message: '我会继续处理这个任务。' },
        }),
        JSON.stringify({
          timestamp: '2026-04-13T08:35:10.000Z',
          type: 'response_item',
          payload: { type: 'reasoning' },
        }),
      ].join('\n'),
    );

    expect(readSessionTranscript(filePath)).toEqual([
      {
        id: '2026-04-13T08:34:36.000Z-user-0',
        role: 'user',
        message: '我要出去了，按照你的建议继续做',
        timestamp: '2026-04-13T08:34:36.000Z',
      },
      {
        id: '2026-04-13T08:35:00.000Z-assistant-1',
        role: 'assistant',
        message: '我会继续处理这个任务。',
        timestamp: '2026-04-13T08:35:00.000Z',
      },
    ]);
  });
});
