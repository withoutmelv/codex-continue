import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export const electronMainExternal = ['better-sqlite3', 'node:sqlite'];

export default defineConfig(({ command }) => {
  const enableElectron = command === 'build' || process.env.CONTINUE_DESKTOP_DEV === '1';

  return {
    plugins: [
      react(),
      ...(enableElectron
        ? [
            electron({
              main: {
                entry: 'electron/main/index.ts',
                vite: {
                  build: {
                    rollupOptions: {
                      external: electronMainExternal,
                    },
                  },
                },
              },
              preload: { input: 'electron/preload/index.ts' },
            }),
          ]
        : []),
    ],
  };
});
