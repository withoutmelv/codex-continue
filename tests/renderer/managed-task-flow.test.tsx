import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/app/App';

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
}));

describe('managed task flow', () => {
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
});
