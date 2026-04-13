import { render, screen } from '@testing-library/react';
import App from '../../src/app/App';

describe('App shell', () => {
  it('renders the product title', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /codex continue desktop/i }),
    ).toBeInTheDocument();
  });
});
