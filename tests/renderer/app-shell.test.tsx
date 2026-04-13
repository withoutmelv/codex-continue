import { render, screen } from '@testing-library/react';
import App from '../../src/app/App';

describe('App shell', () => {
  it('renders the product title', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /codex continue 桌面端/i }),
    ).toBeInTheDocument();
  });
});
