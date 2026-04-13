import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/app/App';

vi.mock('../../src/lib/electronApi', () => ({
  listSessions: vi.fn().mockResolvedValue({
    sessions: [
      {
        id: 'session-1',
        title: 'Continue',
        cwd: '/repo',
        rolloutPath: '/tmp/rollout.jsonl',
        updatedAt: 1776069276,
      },
    ],
  }),
  getSessionTranscript: vi.fn().mockResolvedValue({ entries: [] }),
  startTask: vi.fn().mockResolvedValue({ taskId: 'task-1' }),
  stopTask: vi.fn().mockResolvedValue(undefined),
  listTasks: vi.fn().mockResolvedValue([
    {
      taskId: 'task-1',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue',
      targetRounds: 2,
      completedRounds: 1,
      perRoundTimeoutMs: 1000,
      terminalBinding: null,
      status: 'Failed',
      lastExitCode: 1,
      lastStatusText: 'timed_out',
      startedAt: 1776069276,
      updatedAt: 1776069276,
    },
  ]),
  getTaskSnapshot: vi.fn().mockResolvedValue({
    task: {
      taskId: 'task-1',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue',
      targetRounds: 2,
      completedRounds: 1,
      perRoundTimeoutMs: 1000,
      terminalBinding: null,
      status: 'Failed',
      lastExitCode: 1,
      lastStatusText: 'timed_out',
      startedAt: 1776069276,
      updatedAt: 1776069276,
    },
    rounds: [
      {
        taskId: 'task-1',
        roundNumber: 1,
        exitCode: 1,
        resultType: 'timed_out',
        lastMessage: 'Still working',
        durationMs: 1000,
      },
    ],
  }),
}));

describe('managed task history tab', () => {
  it('shows the latest task and its rounds after switching tabs', async () => {
    render(<App />);

    await screen.findByRole('button', { name: /托管历史/i });
    fireEvent.click(screen.getByRole('button', { name: /托管历史/i }));

    await waitFor(() => {
      expect(screen.getByText(/单轮超时/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/第 1 轮/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Still working/i)).toBeInTheDocument();
  });
});
