import { render, screen } from '@testing-library/react';
import App from '../../src/app/App';

describe('MVP layout', () => {
  it('renders the session list and task controls', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /session library/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /auto host/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refresh sessions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/native terminal window/i)).toBeInTheDocument();
  });
});
