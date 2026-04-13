import path from 'node:path';
import { resolvePreloadPath } from '../../electron/main/window';

describe('resolvePreloadPath', () => {
  it('uses the built preload module in development', () => {
    expect(resolvePreloadPath('/tmp/dist-electron', true)).toBe(
      path.join('/tmp/dist-electron', 'index.mjs'),
    );
  });

  it('uses the built preload module in production', () => {
    expect(resolvePreloadPath('/tmp/dist-electron', false)).toBe(
      path.join('/tmp/dist-electron', 'index.mjs'),
    );
  });
});
