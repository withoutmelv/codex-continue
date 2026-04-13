import { fireEvent, render, screen } from '@testing-library/react';
import App from '../../src/app/App';

describe('language toggle', () => {
  it('defaults to chinese and switches static UI copy back to english', async () => {
    render(<App />);

    await screen.findByRole('heading', { name: /codex continue 桌面端/i });

    expect(screen.getByRole('heading', { name: /会话列表/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /自动托管设置/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /自动托管/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /刷新会话/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /搜索项目/i })).toBeInTheDocument();
    expect(screen.getByText(/当前状态/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));

    expect(
      screen.getByRole('heading', { name: /session library/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /auto host/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search projects/i })).toBeInTheDocument();
    expect(screen.getByText(/current status/i)).toBeInTheDocument();
  });
});
