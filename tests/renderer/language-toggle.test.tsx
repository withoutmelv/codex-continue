import { fireEvent, render, screen } from '@testing-library/react';
import App from '../../src/app/App';

describe('language toggle', () => {
  it('switches static UI copy between english and chinese', async () => {
    render(<App />);

    await screen.findByRole('heading', { name: /codex continue desktop/i });

    fireEvent.click(screen.getByRole('button', { name: '中文' }));

    expect(
      screen.getByRole('heading', { name: /codex continue 桌面端/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /会话列表/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /自动托管设置/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /自动托管/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /刷新会话/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));

    expect(
      screen.getByRole('heading', { name: /session library/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /auto host/i }),
    ).toBeInTheDocument();
  });
});
