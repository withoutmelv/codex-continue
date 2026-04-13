type ParseInput = {
  lines: string[];
  exitCode: number;
  durationMs: number;
  timedOut?: boolean;
  stopped?: boolean;
};

export function parseCodexRound(input: ParseInput) {
  let sawTurnCompleted = false;
  let lastMessage = '';

  for (const line of input.lines) {
    if (!line.trim().startsWith('{')) {
      continue;
    }

    const event = JSON.parse(line);

    if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
      lastMessage = event.item.text ?? '';
    }

    if (event.type === 'turn.completed') {
      sawTurnCompleted = true;
    }
  }

  const resultType = input.stopped
    ? 'stopped'
    : input.timedOut
      ? 'timed_out'
      : sawTurnCompleted && input.exitCode === 0
        ? 'completed'
        : 'process_error';

  return {
    completed: sawTurnCompleted && input.exitCode === 0,
    exitCode: input.exitCode,
    resultType,
    lastMessage,
    durationMs: input.durationMs,
  };
}
