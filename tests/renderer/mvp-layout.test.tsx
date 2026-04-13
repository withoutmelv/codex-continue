import { render, screen } from '@testing-library/react';
import App from '../../src/app/App';

describe('MVP layout', () => {
  it('renders a compact sidebar and a single dominant managed-task panel', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /会话列表/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /自动托管设置/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('session-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('session-scroll-region')).toBeInTheDocument();
    expect(screen.getByTestId('task-workspace')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /自动托管/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /刷新会话/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '中文' })).toBeInTheDocument();
    expect(screen.getByText(/当前状态/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /停止/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /任务状态/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /原生终端窗口/i }),
    ).not.toBeInTheDocument();
  });
});
