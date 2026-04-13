type ParseInput = {
  lines: string[];
  exitCode: number;
  durationMs: number;
};

const statusPattern = /STATUS:\s*(DONE|NEEDS_INPUT|BLOCKED|RETRY)/i;

export function parseCodexRound(input: ParseInput) {
  let sawTurnCompleted = false;
  let lastMessage = '';

  for (const line of input.lines) {
    const event = JSON.parse(line);

    if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
      lastMessage = event.item.text ?? '';
    }

    if (event.type === 'turn.completed') {
      sawTurnCompleted = true;
    }
  }

  const marker = lastMessage.match(statusPattern)?.[0] ?? 'unknown_result';

  return {
    completed: sawTurnCompleted && input.exitCode === 0,
    exitCode: input.exitCode,
    resultType: marker,
    lastMessage,
    durationMs: input.durationMs,
  };
}
