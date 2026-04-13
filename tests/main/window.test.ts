import path from 'node:path';
import { resolvePreloadPath, resolveRendererEntry } from '../../electron/main/window';

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

describe('resolveRendererEntry', () => {
  const originalDevServerUrl = process.env.VITE_DEV_SERVER_URL;

  afterEach(() => {
    if (originalDevServerUrl === undefined) {
      delete process.env.VITE_DEV_SERVER_URL;
      return;
    }

    process.env.VITE_DEV_SERVER_URL = originalDevServerUrl;
  });

  it('uses the injected Vite dev server url in development', () => {
    process.env.VITE_DEV_SERVER_URL = 'http://127.0.0.1:4173';

    expect(resolveRendererEntry('/tmp/dist-electron', true)).toBe(
      'http://127.0.0.1:4173',
    );
  });
});
