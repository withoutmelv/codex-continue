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
        updatedAt: 100,
      },
    ],
  }),
  startTask: vi.fn().mockResolvedValue({ taskId: 'task-1' }),
  stopTask: vi.fn().mockResolvedValue(undefined),
  listTasks: vi.fn().mockResolvedValue([]),
}));

describe('managed task flow', () => {
  it('loads sessions and starts a managed task', async () => {
    render(<App />);

    await screen.findByText(/^repo$/i);

    fireEvent.change(screen.getByLabelText(/发送次数/i), {
      target: { value: '4' },
    });

    fireEvent.click(screen.getByRole('button', { name: /自动托管/i }));

    await waitFor(() => {
      expect(screen.getByText(/正在启动终端/i)).toBeInTheDocument();
    });
  });
});
