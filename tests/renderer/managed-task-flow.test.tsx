import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/app/App';
import * as electronApi from '../../src/lib/electronApi';

vi.mock('../../src/lib/electronApi', () => ({
  listSessions: vi.fn().mockResolvedValue({
    sessions: [
      {
        id: '019d826a',
        title: 'Continue desktop product planning',
        cwd: '/repo',
        rolloutPath: '/tmp/rollout.jsonl',
        updatedAt: 1776069276,
      },
    ],
  }),
  getSessionTranscript: vi.fn().mockResolvedValue({
    entries: [
      {
        id: '1',
        role: 'user',
        message: '我要出去了，按照你的建议继续做',
        timestamp: '2026-04-13T08:34:36.000Z',
      },
      {
        id: '2',
        role: 'assistant',
        message: '我会继续处理这个任务。',
        timestamp: '2026-04-13T08:35:00.000Z',
      },
    ],
  }),
  startTask: vi.fn().mockResolvedValue({ taskId: 'task-1' }),
  stopTask: vi.fn().mockResolvedValue(undefined),
  listTasks: vi.fn().mockResolvedValue([]),
  getTaskSnapshot: vi.fn().mockResolvedValue({
    task: {
      taskId: 'task-1',
      sessionId: '019d826a',
      cwd: '/repo',
      fixedPrompt: '我要出去了，按照你的建议继续做',
      targetRounds: 8,
      completedRounds: 0,
      perRoundTimeoutMs: 900_000,
      terminalBinding: '/tmp/task-1',
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
        lastMessage: '我会继续处理这个任务。',
        durationMs: 1000,
      },
    ],
  }),
}));

describe('managed task flow', () => {
  const listTasksMock = vi.mocked(electronApi.listTasks);

  beforeEach(() => {
    listTasksMock.mockReset();
    listTasksMock.mockResolvedValue([]);
  });

  it('loads sessions, shows details, and starts a managed task', async () => {
    render(<App />);

    await screen.findByText(/^repo$/i);
    expect(screen.getByText('2026/4/13 16:34:36')).toBeInTheDocument();
    expect(screen.getByText('/repo')).toBeInTheDocument();
    expect(screen.getByText('codex resume 019d826a')).toBeInTheDocument();
    expect(screen.getByDisplayValue('我要出去了，按照你的建议继续做')).toBeInTheDocument();
    expect(await screen.findByText('我会继续处理这个任务。')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/发送次数/i), {
      target: { value: '4' },
    });

    fireEvent.click(screen.getByRole('button', { name: /自动托管/i }));

    await waitFor(() => {
      expect(screen.getByText(/正在启动终端/i)).toBeInTheDocument();
    });
  });

  it('shows a dedicated timeout status detail when a round times out', async () => {
    listTasksMock
      .mockResolvedValueOnce([
        {
          taskId: 'task-1',
          sessionId: '019d826a',
          cwd: '/repo',
          fixedPrompt: '我要出去了，按照你的建议继续做',
          targetRounds: 8,
          completedRounds: 0,
          perRoundTimeoutMs: 900_000,
          terminalBinding: '/tmp/task-1',
          status: 'RunningRound',
          lastExitCode: null,
          lastStatusText: null,
          startedAt: 1776069276,
          updatedAt: 1776069276,
        },
      ])
      .mockResolvedValue([
        {
          taskId: 'task-1',
          sessionId: '019d826a',
          cwd: '/repo',
          fixedPrompt: '我要出去了，按照你的建议继续做',
          targetRounds: 8,
          completedRounds: 0,
          perRoundTimeoutMs: 900_000,
          terminalBinding: '/tmp/task-1',
          status: 'Failed',
          lastExitCode: 1,
          lastStatusText: 'timed_out',
          startedAt: 1776069276,
          updatedAt: 1776069276,
        },
      ]);

    render(<App />);

    await screen.findByText(/^repo$/i);
    fireEvent.click(screen.getByRole('button', { name: /自动托管/i }));

    await waitFor(() => {
      expect(listTasksMock).toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(screen.getByText(/单轮超时/i)).toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });

  it('keeps timeout detail visible in the managed task history tab', async () => {
    listTasksMock.mockResolvedValue([
      {
        taskId: 'task-1',
        sessionId: '019d826a',
        cwd: '/repo',
        fixedPrompt: '我要出去了，按照你的建议继续做',
        targetRounds: 8,
        completedRounds: 1,
        perRoundTimeoutMs: 900_000,
        terminalBinding: null,
        status: 'Failed',
        lastExitCode: 1,
        lastStatusText: 'timed_out',
        startedAt: 1776069276,
        updatedAt: 1776069276,
      },
    ]);

    render(<App />);

    await screen.findByText(/^repo$/i);
    fireEvent.click(screen.getByRole('button', { name: /托管历史/i }));

    await waitFor(() => {
      expect(screen.getByText(/单轮超时/i)).toBeInTheDocument();
    });
  });
});
