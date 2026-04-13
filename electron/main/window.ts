import { BrowserWindow } from 'electron';
import path from 'node:path';

export function resolvePreloadPath(baseDir: string, _isDev: boolean) {
  return path.join(baseDir, 'index.mjs');
}

export function resolveRendererEntry(baseDir: string, isDev: boolean) {
  if (isDev) {
    return process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
  }

  return path.join(baseDir, '../../dist/index.html');
}

export function createMainWindow(baseDir: string, isDev: boolean) {
  return new BrowserWindow({
    width: 1440,
    height: 960,
    webPreferences: {
      preload: resolvePreloadPath(baseDir, isDev),
    },
  });
}
