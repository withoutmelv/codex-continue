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

    await screen.findByText(/continue desktop product planning/i);

    fireEvent.change(screen.getByLabelText(/send count/i), {
      target: { value: '4' },
    });

    fireEvent.click(screen.getByRole('button', { name: /auto host/i }));

    await waitFor(() => {
      expect(screen.getByText(/launchingterminal/i)).toBeInTheDocument();
    });
  });
});
