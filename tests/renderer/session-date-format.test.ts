import { formatSessionTimestamp } from '../../src/features/sessions/formatSessionTimestamp';

describe('formatSessionTimestamp', () => {
  it('formats second-based timestamps as YYYY/M/D HH:mm:ss', () => {
    const timestamp = Math.floor(new Date(2026, 3, 13, 16, 34, 36).getTime() / 1000);
    expect(formatSessionTimestamp(timestamp)).toBe('2026/4/13 16:34:36');
  });

  it('also accepts millisecond-based timestamps', () => {
    const timestamp = new Date(2026, 3, 13, 16, 34, 36).getTime();
    expect(formatSessionTimestamp(timestamp)).toBe('2026/4/13 16:34:36');
  });
});
