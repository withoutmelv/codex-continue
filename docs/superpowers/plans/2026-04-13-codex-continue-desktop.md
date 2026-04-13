# Codex Continue Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Electron desktop app that reads local Codex sessions, lets the user select one existing session, and runs repeated `codex exec resume` rounds in one reusable native terminal window.

**Architecture:** Use Electron + React + TypeScript. Keep all Codex and OS integration in the Electron main process, expose a narrow preload API to the renderer, and isolate terminal control behind a per-platform adapter contract. Drive repeated rounds through a managed task orchestrator backed by an app-owned SQLite store and a file-queue-based terminal runner.

**Tech Stack:** Electron, React, TypeScript, Vite, vite-plugin-electron, better-sqlite3, Zod, Vitest, React Testing Library, electron-builder, pnpm

---

## File Structure

### Root

- `package.json`: dependency manifest, scripts, Electron Builder config
- `.gitignore`: ignore build outputs, app data scratch files, and local brainstorm artifacts
- `tsconfig.json`: shared TypeScript configuration for renderer and main process
- `vite.config.ts`: Vite + Electron build wiring
- `vitest.config.ts`: test environment mapping for renderer and main process
- `vitest.setup.ts`: Jest DOM setup for renderer tests
- `index.html`: renderer entry HTML

### Shared Contracts

- `src/shared/schemas.ts`: shared Zod schemas and TypeScript types for sessions, tasks, rounds, and preload API payloads

### Renderer

- `src/main.tsx`: renderer bootstrap
- `src/app/App.tsx`: shell component for the single-screen MVP
- `src/styles/tokens.css`: Azure Clarity tokens from `DESIGN.md`
- `src/styles/app.css`: layout and component styling
- `src/features/sessions/SessionList.tsx`: read-only session list
- `src/features/tasks/TaskConfigForm.tsx`: fixed prompt, round count, timeout, start/stop controls
- `src/features/tasks/TaskStatusPanel.tsx`: task state, last round result, recent history
- `src/lib/electronApi.ts`: typed renderer wrapper around the preload API

### Electron Main

- `electron/main/index.ts`: app bootstrap, BrowserWindow creation, IPC registration
- `electron/main/window.ts`: BrowserWindow factory
- `electron/preload/index.ts`: `contextBridge` API exposure
- `electron/main/ipc/sessions.ts`: session list IPC handlers
- `electron/main/ipc/tasks.ts`: managed task IPC handlers
- `electron/main/services/codexSessionRepo.ts`: read-only adapter for `~/.codex/state_5.sqlite`
- `electron/main/services/taskStore.ts`: app-owned SQLite persistence for managed tasks and rounds
- `electron/main/services/codexEventParser.ts`: JSONL event and status marker parser
- `electron/main/services/taskDirectories.ts`: task work directory and queue file helpers
- `electron/main/services/taskOrchestrator.ts`: serial round coordinator and state machine
- `electron/main/services/taskRuntime.ts`: concrete bridge from the orchestrator to terminal launch, queue writes, and result polling

### Terminal Adapters And Runner

- `electron/main/terminals/terminalAdapter.ts`: shared adapter interface
- `electron/main/terminals/macosTerminalAdapter.ts`: `Terminal.app` implementation via AppleScript
- `electron/main/terminals/windowsTerminalAdapter.ts`: Windows Terminal implementation via `wt`
- `electron/main/terminals/linuxTerminalAdapter.ts`: Linux implementation via `x-terminal-emulator`/`gnome-terminal` fallback
- `electron/main/terminals/factory.ts`: adapter selection by platform
- `electron/runner/terminalRunner.ts`: long-lived process launched inside the native terminal window, polling for round requests and running `codex exec resume`

### Tests

- `tests/renderer/app-shell.test.tsx`
- `tests/renderer/mvp-layout.test.tsx`
- `tests/renderer/managed-task-flow.test.tsx`
- `tests/main/codexSessionRepo.test.ts`
- `tests/main/taskStore.test.ts`
- `tests/main/codexEventParser.test.ts`
- `tests/main/taskOrchestrator.test.ts`
- `tests/main/runnerQueue.test.ts`
- `tests/main/macosTerminalAdapter.test.ts`
- `tests/main/windowsTerminalAdapter.test.ts`
- `tests/main/linuxTerminalAdapter.test.ts`
- `tests/main/taskExecution.integration.test.ts`

## Task 1: Bootstrap The Repository And Toolchain

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`
- Test: `tests/renderer/app-shell.test.tsx`

- [ ] **Step 1: Create the repository metadata and build configuration**

```json
{
  "name": "codex-continue-desktop",
  "version": "0.1.0",
  "private": true,
  "main": "dist-electron/main/index.js",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build && electron-builder",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "postinstall": "electron-builder install-app-deps"
  },
  "dependencies": {
    "better-sqlite3": "^12.0.0",
    "electron": "^37.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "electron-builder": "^26.0.0",
    "jsdom": "^26.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vite-plugin-electron": "^0.29.0",
    "vitest": "^3.2.0"
  },
  "build": {
    "appId": "dev.withoutmelv.codexcontinue",
    "files": [
      "dist/**",
      "dist-electron/**",
      "package.json"
    ],
    "directories": {
      "output": "release"
    }
  }
}
```

```gitignore
node_modules
dist
dist-electron
release
.DS_Store
.superpowers
coverage
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "electron", "tests", "vite.config.ts", "vitest.config.ts"]
}
```

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: { entry: 'electron/main/index.ts' },
      preload: { input: 'electron/preload/index.ts' }
    })
  ]
});
```

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['vitest.setup.ts'],
    environmentMatchGlobs: [
      ['tests/renderer/**', 'jsdom'],
      ['tests/main/**', 'node']
    ]
  }
});
```

```ts
import '@testing-library/jest-dom/vitest';
```

```bash
git init
```

- [ ] **Step 2: Install the dependencies**

Run: `pnpm install`
Expected: install completes without peer dependency errors and writes `pnpm-lock.yaml`

- [ ] **Step 3: Write the failing renderer smoke test**

```tsx
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
```

- [ ] **Step 4: Run the smoke test to verify it fails**

Run: `pnpm vitest run tests/renderer/app-shell.test.tsx`
Expected: FAIL with module resolution errors because `src/app/App.tsx` and renderer bootstrap files do not exist yet

- [ ] **Step 5: Create the minimal Electron + React shell**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Codex Continue Desktop</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/tokens.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <h1>Codex Continue Desktop</h1>
      <p>Bootstrapping the Azure Clarity shell.</p>
    </main>
  );
}
```

```css
:root {
  --color-primary: #004ac6;
  --color-primary-container: #2563eb;
  --color-surface: #f7f9fb;
  --color-on-surface: #191c1e;
  --font-display: 'Manrope', 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

```css
html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-family: var(--font-body);
}

.app-shell {
  padding: 48px;
}

h1 {
  font-family: var(--font-display);
}
```

- [ ] **Step 6: Add the Electron entrypoints and verify the bootstrap**

```ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const isDev = !app.isPackaged;

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  if (isDev) {
    window.loadURL('http://localhost:5173');
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    window.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
```

```ts
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronApi', {});
```

Run: `pnpm vitest run tests/renderer/app-shell.test.tsx`
Expected: PASS with `1 passed`

Run: `pnpm typecheck`
Expected: PASS with no TypeScript errors

- [ ] **Step 7: Commit the bootstrap**

```bash
git add .
git commit -m "chore: bootstrap electron desktop workspace"
```

## Task 2: Build The Azure Clarity MVP Shell

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/app.css`
- Create: `src/features/sessions/SessionList.tsx`
- Create: `src/features/tasks/TaskConfigForm.tsx`
- Create: `src/features/tasks/TaskStatusPanel.tsx`
- Test: `tests/renderer/mvp-layout.test.tsx`

- [ ] **Step 1: Write the failing layout test**

```tsx
import { render, screen } from '@testing-library/react';
import App from '../../src/app/App';

describe('MVP layout', () => {
  it('renders the session list and task controls', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /session library/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auto host/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh sessions/i })).toBeInTheDocument();
    expect(screen.getByText(/native terminal window/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the layout test to verify it fails**

Run: `pnpm vitest run tests/renderer/mvp-layout.test.tsx`
Expected: FAIL because the current `App` shell only renders a title and paragraph

- [ ] **Step 3: Implement the static Azure Clarity screen**

```tsx
type SessionSummary = {
  id: string;
  title: string;
  cwd: string;
  updatedLabel: string;
};

const demoSessions: SessionSummary[] = [
  {
    id: '019d826a-3c4c-7d91-a499-037fb56f7615',
    title: 'Continue desktop product planning',
    cwd: '/Users/withoutmelv/work/continue-app',
    updatedLabel: 'just now',
  },
  {
    id: '019d8285-a7b1-7482-a2a6-3d0373589c6e',
    title: 'Resume chain verification',
    cwd: '/Users/withoutmelv/work/continue-app',
    updatedLabel: '2m ago',
  },
];

import { SessionList } from '../features/sessions/SessionList';
import { TaskConfigForm } from '../features/tasks/TaskConfigForm';
import { TaskStatusPanel } from '../features/tasks/TaskStatusPanel';

export default function App() {
  return (
    <main className="app-shell azure-layout">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Azure Clarity / MVP</p>
          <h1>Codex Continue Desktop</h1>
          <p className="hero-copy">
            Select one existing Codex session and run repeated resume rounds in one native terminal.
          </p>
        </div>
        <aside className="hero-card">
          <p className="eyebrow">Scope</p>
          <strong className="hero-number">Lean</strong>
          <p>Existing sessions only. No delete. No new chat.</p>
        </aside>
      </section>

      <section className="content-grid">
        <SessionList sessions={demoSessions} selectedSessionId={demoSessions[0].id} />
        <div className="main-stack">
          <TaskConfigForm />
          <TaskStatusPanel />
        </div>
      </section>
    </main>
  );
}
```

```tsx
type SessionSummary = {
  id: string;
  title: string;
  cwd: string;
  updatedLabel: string;
};

type SessionListProps = {
  sessions: SessionSummary[];
  selectedSessionId: string;
};

export function SessionList({ sessions, selectedSessionId }: SessionListProps) {
  return (
    <section className="surface-block">
      <h2>Session Library</h2>
      <div className="session-list">
        {sessions.map((session) => (
          <article
            key={session.id}
            className={session.id === selectedSessionId ? 'session-card selected' : 'session-card'}
          >
            <strong>{session.id.slice(0, 12)}...</strong>
            <p>{session.title}</p>
            <small>{session.cwd}</small>
            <span>{session.updatedLabel}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
```

```tsx
export function TaskConfigForm() {
  return (
    <section className="surface-card">
      <h2>Managed Task Control</h2>
      <label className="field">
        <span>Fixed Prompt</span>
        <textarea defaultValue="Continue the current task. End with STATUS: DONE, NEEDS_INPUT, BLOCKED, or RETRY." />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Send Count</span>
          <input defaultValue="8" />
        </label>
        <label className="field">
          <span>Per-Round Timeout</span>
          <input defaultValue="15" />
        </label>
      </div>
      <div className="button-row">
        <button className="primary-button">Auto Host</button>
        <button className="secondary-button">Stop</button>
        <button className="secondary-button">Refresh Sessions</button>
      </div>
    </section>
  );
}
```

```tsx
export function TaskStatusPanel() {
  return (
    <section className="status-grid">
      <article className="surface-card">
        <h2>Task Status</h2>
        <p>Current state: RunningRound</p>
        <p>Last status: STATUS: RETRY</p>
        <p>Exit code: 0</p>
      </article>
      <article className="terminal-glass">
        <h2>Native Terminal Window</h2>
        <pre className="terminal-shell">
          <code>{`$ codex exec resume 019d826a... "...prompt..." --json`}</code>
        </pre>
      </article>
    </section>
  );
}
```

```css
:root {
  --color-primary: #004ac6;
  --color-primary-container: #2563eb;
  --color-surface: #f7f9fb;
  --color-surface-low: #f2f4f6;
  --color-surface-card: #ffffff;
  --color-surface-field: #e0e3e5;
  --color-on-surface: #191c1e;
  --shadow-ambient: 0 8px 32px rgba(25, 28, 30, 0.06);
  --radius-card: 20px;
  --radius-shell: 28px;
}
```

```css
.azure-layout {
  display: grid;
  gap: 24px;
  padding: 32px;
}

.hero-panel {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr;
  gap: 24px;
  padding: 32px;
  border-radius: var(--radius-shell);
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 38%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(242, 244, 246, 0.9));
}

.surface-block,
.surface-card {
  background: var(--color-surface-card);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: 0 10px 18px rgba(25, 28, 30, 0.03);
}

.content-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 24px;
}

.button-row {
  display: flex;
  gap: 12px;
}

.primary-button {
  border: 0;
  border-radius: 14px;
  padding: 12px 18px;
  color: white;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-container));
}

.secondary-button {
  border: 0;
  border-radius: 14px;
  padding: 12px 18px;
  color: var(--color-primary);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 0 0 1px rgba(195, 198, 215, 0.15);
}
```

- [ ] **Step 4: Run the layout tests**

Run: `pnpm vitest run tests/renderer/app-shell.test.tsx tests/renderer/mvp-layout.test.tsx`
Expected: PASS with `2 passed`

- [ ] **Step 5: Commit the UI shell**

```bash
git add src tests/renderer
git commit -m "feat: add azure clarity mvp shell"
```

## Task 3: Read Local Codex Sessions Through IPC

**Files:**
- Create: `src/shared/schemas.ts`
- Create: `electron/main/services/codexSessionRepo.ts`
- Create: `electron/main/ipc/sessions.ts`
- Modify: `electron/main/index.ts`
- Modify: `electron/preload/index.ts`
- Create: `src/lib/electronApi.ts`
- Test: `tests/main/codexSessionRepo.test.ts`

- [ ] **Step 1: Write the failing session repository test**

```ts
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CodexSessionRepo } from '../../electron/main/services/codexSessionRepo';

describe('CodexSessionRepo', () => {
  it('returns non-archived sessions sorted by updated_at desc', () => {
    const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sessions-')), 'state.sqlite');
    const db = new Database(dbPath);

    db.exec(`
      create table threads (
        id text primary key,
        rollout_path text not null,
        created_at integer not null,
        updated_at integer not null,
        source text not null,
        model_provider text not null,
        cwd text not null,
        title text not null,
        sandbox_policy text not null,
        approval_mode text not null,
        tokens_used integer not null default 0,
        has_user_event integer not null default 0,
        archived integer not null default 0
      );
    `);

    db.prepare(`
      insert into threads (id, rollout_path, created_at, updated_at, source, model_provider, cwd, title, sandbox_policy, approval_mode, archived)
      values (?, ?, ?, ?, 'exec', 'openai', ?, ?, 'workspace-write', 'never', ?)
    `).run('old', '/tmp/old.jsonl', 1, 10, '/repo/old', 'Old Session', 0);
    db.prepare(`
      insert into threads (id, rollout_path, created_at, updated_at, source, model_provider, cwd, title, sandbox_policy, approval_mode, archived)
      values (?, ?, ?, ?, 'exec', 'openai', ?, ?, 'workspace-write', 'never', ?)
    `).run('new', '/tmp/new.jsonl', 1, 20, '/repo/new', 'New Session', 0);
    db.prepare(`
      insert into threads (id, rollout_path, created_at, updated_at, source, model_provider, cwd, title, sandbox_policy, approval_mode, archived)
      values (?, ?, ?, ?, 'exec', 'openai', ?, ?, 'workspace-write', 'never', ?)
    `).run('archived', '/tmp/a.jsonl', 1, 30, '/repo/a', 'Archived Session', 1);

    const repo = new CodexSessionRepo(dbPath);
    expect(repo.listSessions().map((session) => session.id)).toEqual(['new', 'old']);
  });
});
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run: `pnpm vitest run tests/main/codexSessionRepo.test.ts`
Expected: FAIL because the shared schema and repository classes do not exist

- [ ] **Step 3: Implement the session schema, repository, and preload bridge**

```ts
import { z } from 'zod';

export const sessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  cwd: z.string(),
  rolloutPath: z.string(),
  updatedAt: z.number(),
});

export const listSessionsResponseSchema = z.object({
  sessions: z.array(sessionSummarySchema),
});

export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type ListSessionsResponse = z.infer<typeof listSessionsResponseSchema>;
```

```ts
import Database from 'better-sqlite3';
import os from 'node:os';
import path from 'node:path';
import { type SessionSummary } from '../../../src/shared/schemas';

type ThreadRow = {
  id: string;
  title: string;
  cwd: string;
  rollout_path: string;
  updated_at: number;
};

export class CodexSessionRepo {
  constructor(
    private readonly dbPath = path.join(os.homedir(), '.codex', 'state_5.sqlite'),
  ) {}

  listSessions(): SessionSummary[] {
    const db = new Database(this.dbPath, { readonly: true });
    const rows = db
      .prepare(
        `
          select id, title, cwd, rollout_path, updated_at
          from threads
          where archived = 0
          order by updated_at desc
        `,
      )
      .all() as ThreadRow[];

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      cwd: row.cwd,
      rolloutPath: row.rollout_path,
      updatedAt: row.updated_at,
    }));
  }
}
```

```ts
import { ipcMain } from 'electron';
import { CodexSessionRepo } from '../services/codexSessionRepo';

export function registerSessionHandlers(repo = new CodexSessionRepo()) {
  ipcMain.handle('sessions:list', () => ({
    sessions: repo.listSessions(),
  }));
}
```

```ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerSessionHandlers } from './ipc/sessions';

app.whenReady().then(() => {
  registerSessionHandlers();

  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, '../../dist/index.html'));
  } else {
    window.loadURL('http://localhost:5173');
  }
});
```

```ts
import { contextBridge, ipcRenderer } from 'electron';

const electronApi = {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
```

```ts
import { listSessionsResponseSchema } from '../shared/schemas';

declare global {
  interface Window {
    electronApi: {
      listSessions: () => Promise<unknown>;
    };
  }
}

export async function listSessions() {
  return listSessionsResponseSchema.parse(await window.electronApi.listSessions());
}
```

- [ ] **Step 4: Run the session repository tests**

Run: `pnpm vitest run tests/main/codexSessionRepo.test.ts`
Expected: PASS with `1 passed`

Run: `pnpm typecheck`
Expected: PASS with no preload or schema typing errors

- [ ] **Step 5: Commit the session repository**

```bash
git add electron src tests/main
git commit -m "feat: load codex sessions from local sqlite state"
```

## Task 4: Persist Managed Tasks And Round History

**Files:**
- Modify: `src/shared/schemas.ts`
- Create: `electron/main/services/taskStore.ts`
- Test: `tests/main/taskStore.test.ts`

- [ ] **Step 1: Write the failing task store test**

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TaskStore } from '../../electron/main/services/taskStore';

describe('TaskStore', () => {
  it('creates a managed task and stores round results', () => {
    const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-task-store-')), 'app.sqlite');
    const store = new TaskStore(dbPath);

    const task = store.createTask({
      sessionId: '019d826a',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      targetRounds: 8,
      perRoundTimeoutMs: 900000,
    });

    store.recordRound({
      taskId: task.taskId,
      roundNumber: 1,
      exitCode: 0,
      resultType: 'STATUS: RETRY',
      lastMessage: 'STATUS: RETRY',
      durationMs: 1234,
    });

    const snapshot = store.getTaskSnapshot(task.taskId);
    expect(snapshot.task.completedRounds).toBe(1);
    expect(snapshot.rounds).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the task store test to verify it fails**

Run: `pnpm vitest run tests/main/taskStore.test.ts`
Expected: FAIL because the task schema and store do not exist

- [ ] **Step 3: Implement the task store and schemas**

```ts
import { z } from 'zod';

export const managedTaskSchema = z.object({
  taskId: z.string(),
  sessionId: z.string(),
  cwd: z.string(),
  fixedPrompt: z.string(),
  targetRounds: z.number().int().positive(),
  completedRounds: z.number().int().nonnegative(),
  perRoundTimeoutMs: z.number().int().positive(),
  terminalBinding: z.string().nullable(),
  status: z.enum([
    'Idle',
    'Ready',
    'LaunchingTerminal',
    'RunningRound',
    'RoundFinished',
    'Completed',
    'Stopped',
    'Failed',
  ]),
  lastExitCode: z.number().nullable(),
  lastStatusText: z.string().nullable(),
  startedAt: z.number(),
  updatedAt: z.number(),
});

export const managedTaskRoundSchema = z.object({
  taskId: z.string(),
  roundNumber: z.number().int().positive(),
  exitCode: z.number(),
  resultType: z.string(),
  lastMessage: z.string(),
  durationMs: z.number().int().nonnegative(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
});
```

```ts
import Database from 'better-sqlite3';
import crypto from 'node:crypto';

type CreateTaskInput = {
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  targetRounds: number;
  perRoundTimeoutMs: number;
};

export class TaskStore {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.exec(`
      create table if not exists managed_tasks (
        task_id text primary key,
        session_id text not null,
        cwd text not null,
        fixed_prompt text not null,
        target_rounds integer not null,
        completed_rounds integer not null,
        per_round_timeout_ms integer not null,
        terminal_binding text,
        status text not null,
        last_exit_code integer,
        last_status_text text,
        started_at integer not null,
        updated_at integer not null
      );

      create table if not exists managed_task_rounds (
        round_id text primary key,
        task_id text not null,
        round_number integer not null,
        exit_code integer not null,
        result_type text not null,
        last_message text not null,
        duration_ms integer not null,
        started_at integer not null,
        finished_at integer not null
      );
    `);
  }

  createTask(input: CreateTaskInput) {
    const now = Date.now();
    const taskId = crypto.randomUUID();

    this.db.prepare(`
      insert into managed_tasks (
        task_id, session_id, cwd, fixed_prompt, target_rounds, completed_rounds,
        per_round_timeout_ms, terminal_binding, status, last_exit_code, last_status_text, started_at, updated_at
      ) values (?, ?, ?, ?, ?, 0, ?, null, 'LaunchingTerminal', null, null, ?, ?)
    `).run(taskId, input.sessionId, input.cwd, input.fixedPrompt, input.targetRounds, input.perRoundTimeoutMs, now, now);

    return {
      taskId,
      ...input,
      completedRounds: 0,
      terminalBinding: null,
      status: 'LaunchingTerminal' as const,
      lastExitCode: null,
      lastStatusText: null,
      startedAt: now,
      updatedAt: now,
    };
  }

  recordRound(input: {
    taskId: string;
    roundNumber: number;
    exitCode: number;
    resultType: string;
    lastMessage: string;
    durationMs: number;
  }) {
    const now = Date.now();
    this.db.prepare(`
      insert into managed_task_rounds (
        round_id, task_id, round_number, exit_code, result_type, last_message, duration_ms, started_at, finished_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), input.taskId, input.roundNumber, input.exitCode, input.resultType, input.lastMessage, input.durationMs, now - input.durationMs, now);

    this.db.prepare(`
      update managed_tasks
      set completed_rounds = completed_rounds + 1,
          last_exit_code = ?,
          last_status_text = ?,
          updated_at = ?
      where task_id = ?
    `).run(input.exitCode, input.resultType, now, input.taskId);
  }

  updateTaskStatus(taskId: string, status: string) {
    this.db.prepare(`
      update managed_tasks
      set status = ?, updated_at = ?
      where task_id = ?
    `).run(status, Date.now(), taskId);
  }

  setTerminalBinding(taskId: string, terminalBinding: string) {
    this.db.prepare(`
      update managed_tasks
      set terminal_binding = ?, updated_at = ?
      where task_id = ?
    `).run(terminalBinding, Date.now(), taskId);
  }

  markCompleted(taskId: string) {
    this.updateTaskStatus(taskId, 'Completed');
  }

  markFailed(taskId: string, reason: string) {
    this.db.prepare(`
      update managed_tasks
      set status = 'Failed',
          last_status_text = ?,
          updated_at = ?
      where task_id = ?
    `).run(reason, Date.now(), taskId);
  }

  markStopped(taskId: string) {
    this.updateTaskStatus(taskId, 'Stopped');
  }

  getTaskSnapshot(taskId: string) {
    const task = this.db.prepare(`
      select
        task_id as taskId,
        session_id as sessionId,
        cwd,
        fixed_prompt as fixedPrompt,
        target_rounds as targetRounds,
        completed_rounds as completedRounds,
        per_round_timeout_ms as perRoundTimeoutMs,
        terminal_binding as terminalBinding,
        status,
        last_exit_code as lastExitCode,
        last_status_text as lastStatusText,
        started_at as startedAt,
        updated_at as updatedAt
      from managed_tasks
      where task_id = ?
    `).get(taskId);
    const rounds = this.db.prepare(`
      select
        task_id as taskId,
        round_number as roundNumber,
        exit_code as exitCode,
        result_type as resultType,
        last_message as lastMessage,
        duration_ms as durationMs,
        started_at as startedAt,
        finished_at as finishedAt
      from managed_task_rounds
      where task_id = ?
      order by round_number asc
    `).all(taskId);
    return { task, rounds };
  }

  listActiveTasks() {
    return this.db.prepare(`
      select
        task_id as taskId,
        session_id as sessionId,
        cwd,
        fixed_prompt as fixedPrompt,
        target_rounds as targetRounds,
        completed_rounds as completedRounds,
        per_round_timeout_ms as perRoundTimeoutMs,
        terminal_binding as terminalBinding,
        status,
        last_exit_code as lastExitCode,
        last_status_text as lastStatusText,
        started_at as startedAt,
        updated_at as updatedAt
      from managed_tasks
      where status in ('LaunchingTerminal', 'RunningRound', 'RoundFinished')
      order by updated_at desc
    `).all();
  }
}
```

- [ ] **Step 4: Run the task store tests**

Run: `pnpm vitest run tests/main/taskStore.test.ts`
Expected: PASS with `1 passed`

- [ ] **Step 5: Commit the task persistence layer**

```bash
git add electron src/shared tests/main
git commit -m "feat: persist managed tasks and round history"
```

## Task 5: Implement JSONL Parsing And The Serial Task Orchestrator

**Files:**
- Create: `electron/main/services/codexEventParser.ts`
- Create: `electron/main/services/taskOrchestrator.ts`
- Test: `tests/main/codexEventParser.test.ts`
- Test: `tests/main/taskOrchestrator.test.ts`

- [ ] **Step 1: Write the failing parser and orchestrator tests**

```ts
import { parseCodexRound } from '../../electron/main/services/codexEventParser';

describe('parseCodexRound', () => {
  it('requires turn.completed and extracts the final status marker', () => {
    const result = parseCodexRound({
      lines: [
        '{"type":"thread.started","thread_id":"1"}',
        '{"type":"turn.started"}',
        '{"type":"item.completed","item":{"type":"agent_message","text":"STATUS: RETRY"}}',
        '{"type":"turn.completed","usage":{"input_tokens":1}}',
      ],
      exitCode: 0,
      durationMs: 1000,
    });

    expect(result.completed).toBe(true);
    expect(result.resultType).toBe('STATUS: RETRY');
  });
});
```

```ts
import { TaskOrchestrator } from '../../electron/main/services/taskOrchestrator';

describe('TaskOrchestrator', () => {
  it('runs rounds serially until the target count is reached', async () => {
    const executed: number[] = [];

    const orchestrator = new TaskOrchestrator({
      launchTerminal: async () => ({ terminalBinding: 'terminal-1' }),
      enqueueRound: async ({ roundNumber }) => {
        executed.push(roundNumber);
        return {
          completed: true,
          exitCode: 0,
          resultType: 'STATUS: RETRY',
          lastMessage: 'STATUS: RETRY',
          durationMs: 1000,
        };
      },
      markFailed: async () => undefined,
      markCompleted: async () => undefined,
      markStopped: async () => undefined,
      recordRound: async () => undefined,
      updateTaskStatus: async () => undefined,
    });

    await orchestrator.run({
      taskId: 'task-1',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      targetRounds: 3,
      perRoundTimeoutMs: 1000,
    });

    expect(executed).toEqual([1, 2, 3]);
  });

  it('stops before scheduling the next round when requested', async () => {
    const executed: number[] = [];

    const orchestrator = new TaskOrchestrator({
      launchTerminal: async () => ({ terminalBinding: 'terminal-1' }),
      enqueueRound: async ({ roundNumber }) => {
        executed.push(roundNumber);
        if (roundNumber === 1) {
          orchestrator.stop('task-stop');
        }
        return {
          completed: true,
          exitCode: 0,
          resultType: 'STATUS: RETRY',
          lastMessage: 'STATUS: RETRY',
          durationMs: 1000,
        };
      },
      markFailed: async () => undefined,
      markCompleted: async () => undefined,
      markStopped: async () => undefined,
      recordRound: async () => undefined,
      updateTaskStatus: async () => undefined,
    });

    await orchestrator.run({
      taskId: 'task-stop',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      targetRounds: 3,
      perRoundTimeoutMs: 1000,
    });

    expect(executed).toEqual([1]);
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `pnpm vitest run tests/main/codexEventParser.test.ts tests/main/taskOrchestrator.test.ts`
Expected: FAIL because the parser and orchestrator do not exist

- [ ] **Step 3: Implement the parser and orchestrator**

```ts
type ParseInput = {
  lines: string[];
  exitCode: number;
  durationMs: number;
};

const statusPattern = /STATUS:\s*(DONE|NEEDS_INPUT|BLOCKED|RETRY)/i;

export function parseCodexRound(input: ParseInput) {
  let sawTurnCompleted = false;
  let lastMessage = '';

  for (const line of input.lines) {
    const event = JSON.parse(line);
    if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
      lastMessage = event.item.text ?? '';
    }
    if (event.type === 'turn.completed') {
      sawTurnCompleted = true;
    }
  }

  const marker = lastMessage.match(statusPattern)?.[0] ?? 'unknown_result';

  return {
    completed: sawTurnCompleted && input.exitCode === 0,
    exitCode: input.exitCode,
    resultType: marker,
    lastMessage,
    durationMs: input.durationMs,
  };
}
```

```ts
type RunInput = {
  taskId: string;
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  targetRounds: number;
  perRoundTimeoutMs: number;
};

type RoundResult = {
  completed: boolean;
  exitCode: number;
  resultType: string;
  lastMessage: string;
  durationMs: number;
};

type TaskOrchestratorDeps = {
  launchTerminal: (input: RunInput) => Promise<{ terminalBinding: string }>;
  enqueueRound: (input: RunInput & { roundNumber: number; terminalBinding: string }) => Promise<RoundResult>;
  updateTaskStatus: (taskId: string, status: string) => Promise<void>;
  recordRound: (input: {
    taskId: string;
    roundNumber: number;
    exitCode: number;
    resultType: string;
    lastMessage: string;
    durationMs: number;
  }) => Promise<void>;
  markCompleted: (taskId: string) => Promise<void>;
  markFailed: (taskId: string, reason: string) => Promise<void>;
  markStopped: (taskId: string) => Promise<void>;
};

export class TaskOrchestrator {
  private readonly stoppedTasks = new Set<string>();

  constructor(private readonly deps: TaskOrchestratorDeps) {}

  stop(taskId: string) {
    this.stoppedTasks.add(taskId);
  }

  async run(input: RunInput) {
    await this.deps.updateTaskStatus(input.taskId, 'LaunchingTerminal');
    const { terminalBinding } = await this.deps.launchTerminal(input);

    for (let roundNumber = 1; roundNumber <= input.targetRounds; roundNumber += 1) {
      if (this.stoppedTasks.has(input.taskId)) {
        await this.deps.markStopped(input.taskId);
        return;
      }

      await this.deps.updateTaskStatus(input.taskId, 'RunningRound');

      const result = await this.deps.enqueueRound({ ...input, roundNumber, terminalBinding });

      if (!result.completed) {
        if (this.stoppedTasks.has(input.taskId)) {
          await this.deps.markStopped(input.taskId);
          return;
        }
        await this.deps.markFailed(input.taskId, result.resultType);
        return;
      }

      await this.deps.recordRound({
        taskId: input.taskId,
        roundNumber,
        exitCode: result.exitCode,
        resultType: result.resultType,
        lastMessage: result.lastMessage,
        durationMs: result.durationMs,
      });

      if (this.stoppedTasks.has(input.taskId)) {
        await this.deps.markStopped(input.taskId);
        return;
      }

      await this.deps.updateTaskStatus(input.taskId, 'RoundFinished');
    }

    await this.deps.markCompleted(input.taskId);
  }
}
```

- [ ] **Step 4: Run the parser and orchestrator tests**

Run: `pnpm vitest run tests/main/codexEventParser.test.ts tests/main/taskOrchestrator.test.ts`
Expected: PASS with `2 passed`

- [ ] **Step 5: Commit the core orchestrator**

```bash
git add electron tests/main
git commit -m "feat: add serial codex round orchestrator"
```

## Task 6: Build The Terminal Runner Queue And macOS Adapter

**Files:**
- Create: `electron/main/services/taskDirectories.ts`
- Create: `electron/runner/terminalRunner.ts`
- Create: `electron/main/terminals/terminalAdapter.ts`
- Create: `electron/main/terminals/macosTerminalAdapter.ts`
- Test: `tests/main/runnerQueue.test.ts`
- Test: `tests/main/macosTerminalAdapter.test.ts`

- [ ] **Step 1: Write the failing runner queue and macOS adapter tests**

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeRoundRequest, readRoundRequest } from '../../electron/main/services/taskDirectories';

describe('runner queue', () => {
  it('writes and reads a round request file', () => {
    const taskDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-queue-'));
    writeRoundRequest(taskDir, {
      roundNumber: 1,
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      timeoutMs: 1000,
    });

    const request = readRoundRequest(taskDir, 1);
    expect(request.sessionId).toBe('session-1');
  });
});
```

```ts
import { MacOsTerminalAdapter } from '../../electron/main/terminals/macosTerminalAdapter';

describe('MacOsTerminalAdapter', () => {
  it('builds an osascript command that runs the terminal runner', () => {
    const adapter = new MacOsTerminalAdapter();
    const command = adapter.buildLaunchCommand({
      taskId: 'task-1',
      cwd: '/repo',
      runnerCommand: 'node /app/terminalRunner.js --task-dir /tmp/task-1',
    });

    expect(command).toContain('osascript');
    expect(command).toContain('Terminal');
    expect(command).toContain('terminalRunner.js');
  });
});
```

- [ ] **Step 2: Run the queue and adapter tests to verify they fail**

Run: `pnpm vitest run tests/main/runnerQueue.test.ts tests/main/macosTerminalAdapter.test.ts`
Expected: FAIL because the queue helpers and terminal adapter do not exist

- [ ] **Step 3: Implement the queue helpers and long-lived terminal runner**

```ts
import fs from 'node:fs';
import path from 'node:path';

type RoundRequest = {
  roundNumber: number;
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  timeoutMs: number;
};

export function ensureTaskDirectories(taskDir: string) {
  fs.mkdirSync(path.join(taskDir, 'requests'), { recursive: true });
  fs.mkdirSync(path.join(taskDir, 'results'), { recursive: true });
  fs.mkdirSync(path.join(taskDir, 'control'), { recursive: true });
}

export function writeRoundRequest(taskDir: string, request: RoundRequest) {
  ensureTaskDirectories(taskDir);
  fs.writeFileSync(
    path.join(taskDir, 'requests', `${request.roundNumber}.json`),
    JSON.stringify(request),
  );
}

export function readRoundRequest(taskDir: string, roundNumber: number): RoundRequest {
  return JSON.parse(
    fs.readFileSync(path.join(taskDir, 'requests', `${roundNumber}.json`), 'utf8'),
  ) as RoundRequest;
}

export function writeStopSignal(taskDir: string) {
  ensureTaskDirectories(taskDir);
  fs.writeFileSync(path.join(taskDir, 'control', 'stop'), '1');
}
```

```ts
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const taskDir = process.argv[process.argv.indexOf('--task-dir') + 1];

async function runLoop() {
  const seen = new Set<string>();

  while (true) {
    const requestDir = path.join(taskDir, 'requests');
    const files = fs.existsSync(requestDir) ? fs.readdirSync(requestDir).sort() : [];

    for (const file of files) {
      if (seen.has(file)) continue;
      seen.add(file);

      const request = JSON.parse(fs.readFileSync(path.join(requestDir, file), 'utf8'));
      const args = ['exec', 'resume', request.sessionId, request.fixedPrompt, '--json'];
      const startedAt = Date.now();

      const child = spawn('codex', args, { cwd: request.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
      let combined = '';
      let timedOut = false;
      let stopped = false;
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, request.timeoutMs);
      const stopHandle = setInterval(() => {
        if (fs.existsSync(path.join(taskDir, 'control', 'stop'))) {
          stopped = true;
          child.kill('SIGTERM');
        }
      }, 200);

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        process.stdout.write(text);
        combined += text;
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        process.stderr.write(text);
        combined += text;
      });

      const exitCode = await new Promise<number>((resolve) => child.on('close', (code) => resolve(code ?? 1)));
      clearTimeout(timeoutHandle);
      clearInterval(stopHandle);

      fs.writeFileSync(
        path.join(taskDir, 'results', `${request.roundNumber}.json`),
        JSON.stringify({
          roundNumber: request.roundNumber,
          exitCode,
          timedOut,
          stopped,
          durationMs: Date.now() - startedAt,
          output: combined,
        }),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

void runLoop();
```

- [ ] **Step 4: Implement the macOS terminal adapter and run tests**

```ts
export interface TerminalLaunchInput {
  taskId: string;
  cwd: string;
  runnerCommand: string;
}

export interface TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput): string;
}
```

```ts
import { TerminalAdapter, type TerminalLaunchInput } from './terminalAdapter';

export class MacOsTerminalAdapter implements TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput) {
    const escapedCommand = input.runnerCommand.replace(/"/g, '\\"');
    return [
      'osascript',
      '-e',
      `"tell application \\"Terminal\\" to do script \\"cd ${input.cwd} && ${escapedCommand}\\""`,
    ].join(' ');
  }
}
```

Run: `pnpm vitest run tests/main/runnerQueue.test.ts tests/main/macosTerminalAdapter.test.ts`
Expected: PASS with `2 passed`

- [ ] **Step 5: Commit the terminal runner foundation**

```bash
git add electron tests/main
git commit -m "feat: add terminal runner queue and macos adapter"
```

## Task 7: Add Windows/Linux Adapters And Wire The Main-Process Task API

**Files:**
- Create: `electron/main/terminals/windowsTerminalAdapter.ts`
- Create: `electron/main/terminals/linuxTerminalAdapter.ts`
- Create: `electron/main/terminals/factory.ts`
- Create: `electron/main/services/taskRuntime.ts`
- Create: `electron/main/ipc/tasks.ts`
- Modify: `electron/main/index.ts`
- Modify: `electron/main/services/taskStore.ts`
- Test: `tests/main/windowsTerminalAdapter.test.ts`
- Test: `tests/main/linuxTerminalAdapter.test.ts`
- Test: `tests/main/taskExecution.integration.test.ts`

- [ ] **Step 1: Write the failing adapter and task execution tests**

```ts
import { WindowsTerminalAdapter } from '../../electron/main/terminals/windowsTerminalAdapter';

describe('WindowsTerminalAdapter', () => {
  it('builds a wt launch command', () => {
    const adapter = new WindowsTerminalAdapter();
    const command = adapter.buildLaunchCommand({
      taskId: 'task-1',
      cwd: 'C:/repo',
      runnerCommand: 'node C:/app/terminalRunner.js --task-dir C:/tmp/task-1',
    });

    expect(command).toContain('wt');
    expect(command).toContain('terminalRunner.js');
  });
});
```

```ts
import { LinuxTerminalAdapter } from '../../electron/main/terminals/linuxTerminalAdapter';

describe('LinuxTerminalAdapter', () => {
  it('builds an x-terminal-compatible command', () => {
    const adapter = new LinuxTerminalAdapter();
    const command = adapter.buildLaunchCommand({
      taskId: 'task-1',
      cwd: '/repo',
      runnerCommand: 'node /app/terminalRunner.js --task-dir /tmp/task-1',
    });

    expect(command).toContain('sh -lc');
  });
});
```

```ts
import { createTaskHandlers } from '../../electron/main/ipc/tasks';

describe('task execution integration', () => {
  it('creates a task and schedules round 1', async () => {
    const calls: string[] = [];

    const handlers = createTaskHandlers({
      createTask: async () => ({ taskId: 'task-1' }),
      runTask: async () => {
        calls.push('runTask');
      },
      stopTask: async () => {
        calls.push('stopTask');
      },
      listActiveTasks: async () => [],
    });

    await handlers.start({
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue the task',
      targetRounds: 2,
      perRoundTimeoutMs: 1000,
    });

    expect(calls).toEqual(['runTask']);
  });
});
```

- [ ] **Step 2: Run the failing task API tests**

Run: `pnpm vitest run tests/main/windowsTerminalAdapter.test.ts tests/main/linuxTerminalAdapter.test.ts tests/main/taskExecution.integration.test.ts`
Expected: FAIL because the remaining adapters, factory, and task IPC layer do not exist

- [ ] **Step 3: Implement the remaining adapters and adapter factory**

```ts
import { TerminalAdapter, type TerminalLaunchInput } from './terminalAdapter';

export class WindowsTerminalAdapter implements TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput) {
    return `wt -d "${input.cwd}" pwsh -NoExit -Command "${input.runnerCommand}"`;
  }
}
```

```ts
import { TerminalAdapter, type TerminalLaunchInput } from './terminalAdapter';

export class LinuxTerminalAdapter implements TerminalAdapter {
  buildLaunchCommand(input: TerminalLaunchInput) {
    return `x-terminal-emulator -e sh -lc 'cd "${input.cwd}" && ${input.runnerCommand}'`;
  }
}
```

```ts
import os from 'node:os';
import { LinuxTerminalAdapter } from './linuxTerminalAdapter';
import { MacOsTerminalAdapter } from './macosTerminalAdapter';
import { WindowsTerminalAdapter } from './windowsTerminalAdapter';

export function createTerminalAdapter() {
  switch (os.platform()) {
    case 'darwin':
      return new MacOsTerminalAdapter();
    case 'win32':
      return new WindowsTerminalAdapter();
    default:
      return new LinuxTerminalAdapter();
  }
}
```

- [ ] **Step 4: Implement task IPC wiring**

```ts
type StartTaskInput = {
  sessionId: string;
  cwd: string;
  fixedPrompt: string;
  targetRounds: number;
  perRoundTimeoutMs: number;
};

type TaskHandlersDeps = {
  createTask: (input: StartTaskInput) => Promise<{ taskId: string }>;
  runTask: (input: StartTaskInput & { taskId: string }) => Promise<void>;
  stopTask: (taskId: string) => Promise<void>;
  listActiveTasks: () => Promise<unknown[]>;
};

export function createTaskHandlers(deps: TaskHandlersDeps) {
  return {
    start: async (input: StartTaskInput) => {
      const { taskId } = await deps.createTask(input);
      await deps.runTask({ ...input, taskId });
      return { taskId };
    },
    stop: async (taskId: string) => deps.stopTask(taskId),
    list: async () => deps.listActiveTasks(),
  };
}
```

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { app } from 'electron';
import { parseCodexRound } from './codexEventParser';
import { createTerminalAdapter } from '../terminals/factory';
import { ensureTaskDirectories, writeRoundRequest, writeStopSignal } from './taskDirectories';
import { TaskOrchestrator } from './taskOrchestrator';
import { TaskStore } from './taskStore';

const execAsync = promisify(exec);

export class TaskRuntime {
  private readonly activeOrchestrators = new Map<string, TaskOrchestrator>();

  constructor(private readonly store: TaskStore) {}

  async runTask(input: StartTaskInput & { taskId: string }) {
    const taskDir = path.join(os.tmpdir(), 'codex-continue', input.taskId);
    ensureTaskDirectories(taskDir);
    const adapter = createTerminalAdapter();
    const runnerEntry = app.isPackaged
      ? path.join(process.resourcesPath, 'dist-electron', 'runner', 'terminalRunner.js')
      : path.join(process.cwd(), 'electron', 'runner', 'terminalRunner.ts');
    const runnerCommand = app.isPackaged
      ? `node "${runnerEntry}" --task-dir "${taskDir}"`
      : `pnpm exec tsx "${runnerEntry}" --task-dir "${taskDir}"`;
    const launchCommand = adapter.buildLaunchCommand({
      taskId: input.taskId,
      cwd: input.cwd,
      runnerCommand,
    });

    const orchestrator = new TaskOrchestrator({
      launchTerminal: async () => {
        await execAsync(launchCommand);
        this.store.setTerminalBinding(input.taskId, taskDir);
        return { terminalBinding: taskDir };
      },
      enqueueRound: async ({ roundNumber, terminalBinding, ...roundInput }) => {
        writeRoundRequest(terminalBinding, {
          roundNumber,
          sessionId: roundInput.sessionId,
          cwd: roundInput.cwd,
          fixedPrompt: roundInput.fixedPrompt,
          timeoutMs: roundInput.perRoundTimeoutMs,
        });

        const resultPath = path.join(terminalBinding, 'results', `${roundNumber}.json`);
        while (!fs.existsSync(resultPath)) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        const raw = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
        return parseCodexRound({
          lines: raw.output.split(/\r?\n/).filter(Boolean),
          exitCode: raw.exitCode,
          durationMs: raw.durationMs,
        });
      },
      updateTaskStatus: async (taskId, status) => this.store.updateTaskStatus(taskId, status),
      recordRound: async (payload) => this.store.recordRound(payload),
      markCompleted: async (taskId) => this.store.markCompleted(taskId),
      markFailed: async (taskId, reason) => this.store.markFailed(taskId, reason),
      markStopped: async (taskId) => this.store.markStopped(taskId),
    });

    this.activeOrchestrators.set(input.taskId, orchestrator);
    try {
      await orchestrator.run(input);
    } finally {
      this.activeOrchestrators.delete(input.taskId);
    }
  }

  async stopTask(taskId: string) {
    const taskDir = path.join(os.tmpdir(), 'codex-continue', taskId);
    writeStopSignal(taskDir);
    this.activeOrchestrators.get(taskId)?.stop(taskId);
    this.store.markStopped(taskId);
  }
}
```

```ts
import { ipcMain } from 'electron';
import { createTaskHandlers } from './ipc/tasks';

const taskRuntime = new TaskRuntime(taskStore);

const taskHandlers = createTaskHandlers({
  createTask: async (input) => taskStore.createTask(input),
  runTask: async (input) => taskRuntime.runTask(input),
  stopTask: async (taskId) => taskRuntime.stopTask(taskId),
  listActiveTasks: async () => taskStore.listActiveTasks(),
});

ipcMain.handle('tasks:start', (_event, input) => taskHandlers.start(input));
ipcMain.handle('tasks:stop', (_event, taskId) => taskHandlers.stop(taskId));
ipcMain.handle('tasks:list', () => taskHandlers.list());
```

- [ ] **Step 5: Run the adapter and task API tests**

Run: `pnpm vitest run tests/main/windowsTerminalAdapter.test.ts tests/main/linuxTerminalAdapter.test.ts tests/main/taskExecution.integration.test.ts`
Expected: PASS with `3 passed`

- [ ] **Step 6: Commit the platform adapters and task IPC**

```bash
git add electron tests/main
git commit -m "feat: wire task ipc and platform terminal adapters"
```

## Task 8: Connect The Renderer To Live IPC And Verify The Full MVP

**Files:**
- Modify: `electron/preload/index.ts`
- Modify: `src/lib/electronApi.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/features/sessions/SessionList.tsx`
- Modify: `src/features/tasks/TaskConfigForm.tsx`
- Modify: `src/features/tasks/TaskStatusPanel.tsx`
- Test: `tests/renderer/managed-task-flow.test.tsx`

- [ ] **Step 1: Write the failing renderer flow test**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/app/App';

vi.mock('../../src/lib/electronApi', () => ({
  listSessions: vi.fn().mockResolvedValue({
    sessions: [
      {
        id: '019d826a',
        title: 'Continue desktop product planning',
        cwd: '/repo',
        rolloutPath: '/tmp/rollout.jsonl',
        updatedAt: 100,
      },
    ],
  }),
  startTask: vi.fn().mockResolvedValue({ taskId: 'task-1' }),
  stopTask: vi.fn().mockResolvedValue(undefined),
  listTasks: vi.fn().mockResolvedValue([]),
}));

describe('managed task flow', () => {
  it('loads sessions and starts a managed task', async () => {
    render(<App />);

    await screen.findByText(/continue desktop product planning/i);

    fireEvent.change(screen.getByLabelText(/send count/i), {
      target: { value: '4' },
    });

    fireEvent.click(screen.getByRole('button', { name: /auto host/i }));

    await waitFor(() => {
      expect(screen.getByText(/launchingterminal/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the renderer flow test to verify it fails**

Run: `pnpm vitest run tests/renderer/managed-task-flow.test.tsx`
Expected: FAIL because the renderer still uses static demo data and does not call the preload API

- [ ] **Step 3: Expand the preload API and renderer client**

```ts
import { contextBridge, ipcRenderer } from 'electron';

const electronApi = {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  startTask: (input: unknown) => ipcRenderer.invoke('tasks:start', input),
  stopTask: (taskId: string) => ipcRenderer.invoke('tasks:stop', taskId),
  listTasks: () => ipcRenderer.invoke('tasks:list'),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
```

```ts
import { listSessionsResponseSchema, managedTaskSchema } from '../shared/schemas';

declare global {
  interface Window {
    electronApi: {
      listSessions: () => Promise<unknown>;
      startTask: (input: unknown) => Promise<unknown>;
      stopTask: (taskId: string) => Promise<unknown>;
      listTasks: () => Promise<unknown>;
    };
  }
}

export async function startTask(input: unknown) {
  return managedTaskSchema.pick({ taskId: true }).parse(await window.electronApi.startTask(input));
}

export async function stopTask(taskId: string) {
  return window.electronApi.stopTask(taskId);
}

export async function listTasks() {
  return window.electronApi.listTasks();
}
```

- [ ] **Step 4: Replace static renderer state with live session/task state**

```tsx
import { useEffect, useState } from 'react';
import { listSessions, listTasks, startTask, stopTask } from '../lib/electronApi';

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskState, setTaskState] = useState('Idle');
  const [fixedPrompt, setFixedPrompt] = useState(
    'Continue the current task. End with STATUS: DONE, NEEDS_INPUT, BLOCKED, or RETRY.',
  );
  const [sendCount, setSendCount] = useState(8);
  const [timeoutMinutes, setTimeoutMinutes] = useState(15);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;

  async function refreshSessions() {
    const { sessions } = await listSessions();
    setSessions(sessions);
    setSelectedSessionId((current) => current ?? sessions[0]?.id ?? null);
  }

  useEffect(() => {
    void refreshSessions();
    void listTasks();
  }, []);

  async function handleStart() {
    if (!selectedSession) return;

    setTaskState('LaunchingTerminal');
    const createdTask = await startTask({
      sessionId: selectedSession.id,
      cwd: selectedSession.cwd,
      fixedPrompt,
      targetRounds: sendCount,
      perRoundTimeoutMs: timeoutMinutes * 60_000,
    });
    setActiveTaskId(createdTask.taskId);
  }

  async function handleStop() {
    if (!activeTaskId) return;
    await stopTask(activeTaskId);
    setTaskState('Stopped');
  }

  return (
    <main className="app-shell azure-layout">
      <SessionList
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSelect={setSelectedSessionId}
      />
      <TaskConfigForm
        fixedPrompt={fixedPrompt}
        onFixedPromptChange={setFixedPrompt}
        sendCount={sendCount}
        onSendCountChange={setSendCount}
        timeoutMinutes={timeoutMinutes}
        onTimeoutMinutesChange={setTimeoutMinutes}
        onStart={handleStart}
        onRefreshSessions={refreshSessions}
      />
      <TaskStatusPanel state={taskState} onStop={handleStop} activeTaskId={activeTaskId} />
    </main>
  );
}
```

```tsx
type SessionListProps = {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
};

export function SessionList({ sessions, selectedSessionId, onSelect }: SessionListProps) {
  return (
    <section className="surface-block">
      <h2>Session Library</h2>
      <div className="session-list">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            className={session.id === selectedSessionId ? 'session-card selected' : 'session-card'}
            onClick={() => onSelect(session.id)}
          >
            <strong>{session.id.slice(0, 12)}...</strong>
            <p>{session.title}</p>
            <small>{session.cwd}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
```

```tsx
type TaskConfigFormProps = {
  fixedPrompt: string;
  onFixedPromptChange: (value: string) => void;
  sendCount: number;
  onSendCountChange: (value: number) => void;
  timeoutMinutes: number;
  onTimeoutMinutesChange: (value: number) => void;
  onStart: () => void;
  onRefreshSessions: () => void;
};

export function TaskConfigForm(props: TaskConfigFormProps) {
  return (
    <section className="surface-card">
      <h2>Managed Task Control</h2>
      <label className="field">
        <span>Fixed Prompt</span>
        <textarea
          value={props.fixedPrompt}
          onChange={(event) => props.onFixedPromptChange(event.target.value)}
        />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Send Count</span>
          <input
            aria-label="Send Count"
            value={props.sendCount}
            onChange={(event) => props.onSendCountChange(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Per-Round Timeout</span>
          <input
            aria-label="Per-Round Timeout"
            value={props.timeoutMinutes}
            onChange={(event) => props.onTimeoutMinutesChange(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="button-row">
        <button className="primary-button" onClick={props.onStart}>Auto Host</button>
        <button className="secondary-button" onClick={props.onRefreshSessions}>Refresh Sessions</button>
      </div>
    </section>
  );
}
```

```tsx
type TaskStatusPanelProps = {
  state: string;
  activeTaskId: string | null;
  onStop: () => void;
};

export function TaskStatusPanel({ state, activeTaskId, onStop }: TaskStatusPanelProps) {
  return (
    <section className="status-grid">
      <article className="surface-card">
        <h2>Task Status</h2>
        <p>{state}</p>
        <button className="secondary-button" disabled={!activeTaskId} onClick={onStop}>
          Stop
        </button>
      </article>
      <article className="terminal-glass">
        <h2>Native Terminal Window</h2>
        <pre className="terminal-shell">
          <code>{activeTaskId ? `$ task ${activeTaskId} running in native terminal` : '$ idle'}</code>
        </pre>
      </article>
    </section>
  );
}
```

- [ ] **Step 5: Run the full test suite and production build**

Run: `pnpm vitest run`
Expected: PASS with all renderer and main tests green

Run: `pnpm typecheck`
Expected: PASS with no TypeScript errors

Run: `pnpm build`
Expected: PASS and produce `dist`, `dist-electron`, and `release` outputs

- [ ] **Step 6: Perform the manual MVP verification**

Run: `pnpm dev`
Expected:
- the Electron window opens
- the session list loads from the local Codex state if present
- selecting a session and clicking `Auto Host` creates a managed task
- a native terminal window opens once
- later rounds continue in the same terminal window
- `Stop` prevents subsequent rounds

- [ ] **Step 7: Commit the live MVP**

```bash
git add .
git commit -m "feat: connect live codex hosting workflow"
```

## Self-Review

### Spec Coverage

- Session discovery is covered by Task 3.
- Managed task persistence is covered by Task 4.
- Serial round orchestration is covered by Task 5.
- Native terminal reuse is covered by Tasks 6 and 7.
- Azure Clarity UI is covered by Tasks 2 and 8.
- Stop behavior and live task control are covered by Tasks 7 and 8.

### Placeholder Scan

- No `TODO` or `TBD` markers remain.
- Every code-writing step includes concrete file content or method bodies.
- Every verification step includes an exact command and an expected outcome.

### Type Consistency

- Shared contracts live in `src/shared/schemas.ts`.
- Session payloads use `SessionSummary`.
- Task payloads use `managedTaskSchema`.
- Round outcomes use the `parseCodexRound` result shape consistently across the orchestrator and persistence layer.
