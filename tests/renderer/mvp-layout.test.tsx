import { render, screen } from '@testing-library/react';
import App from '../../src/app/App';

describe('MVP layout', () => {
  it('renders a scrollable sidebar and a dominant task workspace', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /session library/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /managed task control/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('session-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('session-scroll-region')).toBeInTheDocument();
    expect(screen.getByTestId('task-workspace')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /auto host/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refresh sessions/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '中文' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /native terminal window/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/scope/i)).not.toBeInTheDocument();
  });
});
