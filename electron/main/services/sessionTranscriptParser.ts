import fs from 'node:fs';
import { type SessionTranscriptEntry } from '../../../src/shared/schemas';

export function readSessionTranscript(
  rolloutPath: string,
): SessionTranscriptEntry[] {
  if (!fs.existsSync(rolloutPath)) {
    return [];
  }

  const lines = fs.readFileSync(rolloutPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const entries: SessionTranscriptEntry[] = [];

  for (const line of lines) {
    const event = JSON.parse(line) as {
      timestamp?: string;
      type?: string;
      payload?: { type?: string; message?: string };
    };

    if (event.type !== 'event_msg') {
      continue;
    }

    if (
      event.payload?.type !== 'user_message' &&
      event.payload?.type !== 'agent_message'
    ) {
      continue;
    }

    const message = event.payload.message?.trim();
    if (!message) {
      continue;
    }

    const role = event.payload.type === 'user_message' ? 'user' : 'assistant';
    const timestamp = event.timestamp ?? '';
    entries.push({
      id: `${timestamp}-${role}-${entries.length}`,
      role,
      message,
      timestamp,
    });
  }

  return entries;
}
