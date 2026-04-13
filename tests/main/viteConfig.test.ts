import { electronMainExternal } from '../../vite.config';

describe('vite desktop config', () => {
  it('keeps sqlite modules external for the electron main bundle', () => {
    expect(electronMainExternal).toEqual(
      expect.arrayContaining(['better-sqlite3', 'node:sqlite']),
    );
  });
});
