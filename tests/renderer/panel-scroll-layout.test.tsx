import { render, screen, within } from '@testing-library/react';
import App from '../../src/app/App';

describe('panel scroll layout', () => {
  it('renders dedicated scroll regions for each panel inside a fixed app shell', async () => {
    render(<App />);

    expect(await screen.findByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('content-grid')).toBeInTheDocument();
    expect(screen.getByTestId('session-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('session-scroll-region')).toBeInTheDocument();
    expect(screen.getByTestId('task-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('task-control-panel')).toBeInTheDocument();
    expect(screen.getByTestId('task-control-scroll-region')).toBeInTheDocument();
    expect(screen.getByTestId('transcript-panel')).toBeInTheDocument();
    expect(screen.getByTestId('transcript-scroll-region')).toBeInTheDocument();

    expect(
      within(screen.getByTestId('task-control-scroll-region')).getByLabelText(
        /固定指令/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('transcript-panel')).getByRole('heading', {
        name: /对话记录/i,
      }),
    ).toBeInTheDocument();
  });
});
