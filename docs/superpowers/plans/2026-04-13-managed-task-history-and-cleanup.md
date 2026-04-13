# Managed Task History And Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immediate managed-task temp-directory cleanup and a lower-right `Managed Task History` tab that shows persisted task summaries and round details after cleanup.

**Architecture:** Treat `os.tmpdir()/codex-continue/<taskId>` as runtime-only scratch space and `app.sqlite` as the only durable history source. Reuse `tasks:list` for summary polling and history navigation, add `tasks:getSnapshot(taskId)` for one-task detail reads, and keep the existing top-right control panel intact while changing the lower-right panel into a tab switcher between transcript and history.

**Tech Stack:** Electron, React, TypeScript, Node `fs`/`os`/`path`, SQLite (`node:sqlite`), Zod, Vitest, React Testing Library, pnpm

---

## File Structure

### Main Process And Persistence

- Modify: `electron/main/services/taskDirectories.ts`
  - Add a focused helper to recursively delete a managed task's temp directory.
- Modify: `electron/main/services/taskRuntime.ts`
  - Call temp cleanup after terminal task completion and expose just enough dependency injection for focused unit tests.
- Modify: `electron/main/services/taskStore.ts`
  - Keep `listActiveTasks()` as the summary list source and reuse `getTaskSnapshot(taskId)` for round-detail reads.
- Modify: `electron/main/ipc/tasks.ts`
  - Add `getSnapshot(taskId)` and keep `start()` non-blocking.
- Modify: `electron/main/index.ts`
  - Register the new `tasks:getSnapshot` IPC handler.
- Modify: `electron/preload/index.ts`
  - Expose `getTaskSnapshot(taskId)` to the renderer.

### Shared Contracts And Renderer API

- Modify: `src/shared/schemas.ts`
  - Add the response schema/type for one task snapshot.
- Modify: `src/lib/electronApi.ts`
  - Add a typed renderer wrapper for `getTaskSnapshot(taskId)`.

### Renderer

- Create: `src/features/tasks/TaskHistoryPanel.tsx`
  - Render the two-column history view: task list on the left, rounds on the right.
- Modify: `src/app/App.tsx`
  - Add lower-right tab state, history loading, selection state, and snapshot fetching.
- Modify: `src/features/sessions/SessionTranscriptPanel.tsx`
  - Accept a `nested?: boolean` prop so the transcript can render inside the new tabbed panel without duplicating outer card chrome.
- Modify: `src/styles/app.css`
  - Add tab switcher styles and two-column history-panel layout while preserving the current Azure Clarity structure.

### Tests

- Create: `tests/main/taskDirectories.test.ts`
  - Verify recursive temp-directory cleanup.
- Create: `tests/main/taskRuntimeCleanup.test.ts`
  - Verify runtime cleanup happens after terminal completion and not during the stop signal request itself.
- Modify: `tests/main/taskStore.test.ts`
  - Verify snapshot reads still work after temp cleanup and rounds remain ordered.
- Modify: `tests/main/taskExecution.integration.test.ts`
  - Verify `tasks:start` remains backgrounded and `tasks:getSnapshot` returns durable data.
- Create: `tests/renderer/managed-task-history.test.tsx`
  - Verify tab switching, default transcript tab, latest-task auto-selection, and empty-state behavior.
- Modify: `tests/renderer/managed-task-flow.test.tsx`
  - Keep timeout detail rendering covered after the history UI lands.

## Task 1: Add Temp Cleanup Helpers And Failing Main-Process Tests

**Files:**
- Create: `tests/main/taskDirectories.test.ts`
- Create: `tests/main/taskRuntimeCleanup.test.ts`
- Modify: `electron/main/services/taskDirectories.ts`
- Modify: `electron/main/services/taskRuntime.ts`
- Test: `tests/main/taskDirectories.test.ts`
- Test: `tests/main/taskRuntimeCleanup.test.ts`

- [ ] **Step 1: Write the failing cleanup-helper test**

```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ensureTaskDirectories,
  removeTaskDirectory,
} from '../../electron/main/services/taskDirectories';

describe('taskDirectories', () => {
  it('removes a managed task directory recursively', () => {
    const taskDir = path.join(
      os.tmpdir(),
      'codex-continue-test',
      `task-${Date.now()}`,
    );

    ensureTaskDirectories(taskDir);
    fs.writeFileSync(path.join(taskDir, 'results', '1.json'), '{}');

    removeTaskDirectory(taskDir);

    expect(fs.existsSync(taskDir)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run: `pnpm test tests/main/taskDirectories.test.ts`
Expected: FAIL with `removeTaskDirectory is not exported` or `is not a function`

- [ ] **Step 3: Implement the minimal recursive delete helper**

```ts
import fs from 'node:fs';
import path from 'node:path';

export function removeTaskDirectory(taskDir: string) {
  fs.rmSync(taskDir, { recursive: true, force: true });
}
```

- [ ] **Step 4: Write the failing runtime-lifecycle cleanup test**

```ts
import os from 'node:os';
import path from 'node:path';
import { TaskRuntime } from '../../electron/main/services/taskRuntime';

describe('TaskRuntime cleanup', () => {
  it('cleans up the task temp directory after runTask settles', async () => {
    const removedDirs: string[] = [];

    const runtime = new TaskRuntime(
      {
        setTerminalBinding: () => undefined,
        updateTaskStatus: () => undefined,
        recordRound: () => undefined,
        markCompleted: () => undefined,
        markFailed: () => undefined,
        markStopped: () => undefined,
      } as never,
      {
        removeTaskDirectory: (taskDir) => {
          removedDirs.push(taskDir);
        },
        createOrchestrator: () => ({
          run: async () => undefined,
          stop: () => undefined,
        }),
      },
    );

    await runtime.runTask({
      taskId: 'task-123',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue',
      targetRounds: 1,
      perRoundTimeoutMs: 1000,
    });

    expect(removedDirs).toEqual([
      path.join(os.tmpdir(), 'codex-continue', 'task-123'),
    ]);
  });
});
```

- [ ] **Step 5: Run the runtime test to verify it fails**

Run: `pnpm test tests/main/taskRuntimeCleanup.test.ts`
Expected: FAIL because `TaskRuntime` does not yet accept testable cleanup/orchestrator deps

- [ ] **Step 6: Add minimal `TaskRuntime` dependency injection and call cleanup in `finally`**

```ts
type TaskRuntimeDeps = {
  removeTaskDirectory: (taskDir: string) => void;
  createOrchestrator: (deps: ConstructorParameters<typeof TaskOrchestrator>[0]) => TaskOrchestrator;
};

const defaultDeps: TaskRuntimeDeps = {
  removeTaskDirectory,
  createOrchestrator: (deps) => new TaskOrchestrator(deps),
};

export class TaskRuntime {
  constructor(
    private readonly store: TaskStore,
    private readonly deps: TaskRuntimeDeps = defaultDeps,
  ) {}

  async runTask(input: StartTaskInput) {
    const taskDir = path.join(os.tmpdir(), 'codex-continue', input.taskId);
    const orchestrator = this.deps.createOrchestrator({
      launchTerminal: async () => {
        await execFileAsync(launchSpec.command, launchSpec.args);
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

        const raw = JSON.parse(fs.readFileSync(resultPath, 'utf8')) as {
          exitCode: number;
          timedOut?: boolean;
          stopped?: boolean;
          durationMs: number;
          output: string;
        };

        return parseCodexRound({
          lines: raw.output.split(/\r?\n/).filter(Boolean),
          exitCode: raw.exitCode,
          timedOut: raw.timedOut,
          stopped: raw.stopped,
          durationMs: raw.durationMs,
        });
      },
      updateTaskStatus: async (taskId, status) => {
        this.store.updateTaskStatus(taskId, status);
      },
      recordRound: async (payload) => {
        this.store.recordRound(payload);
      },
      markCompleted: async (taskId) => {
        this.store.markCompleted(taskId);
      },
      markFailed: async (taskId, reason) => {
        this.store.markFailed(taskId, reason);
      },
      markStopped: async (taskId) => {
        this.store.markStopped(taskId);
      },
    });

    try {
      await orchestrator.run(input);
    } finally {
      this.activeOrchestrators.delete(input.taskId);
      this.deps.removeTaskDirectory(taskDir);
    }
  }
}
```

- [ ] **Step 7: Re-run both focused tests to verify they pass**

Run: `pnpm test tests/main/taskDirectories.test.ts tests/main/taskRuntimeCleanup.test.ts`
Expected: PASS for both tests

- [ ] **Step 8: Commit**

```bash
git add tests/main/taskDirectories.test.ts tests/main/taskRuntimeCleanup.test.ts electron/main/services/taskDirectories.ts electron/main/services/taskRuntime.ts
git commit -m "feat: clean up managed task temp directories"
```

## Task 2: Add Durable Task Snapshot Contracts And IPC

**Files:**
- Modify: `src/shared/schemas.ts`
- Modify: `electron/main/services/taskStore.ts`
- Modify: `electron/main/ipc/tasks.ts`
- Modify: `electron/main/index.ts`
- Modify: `electron/preload/index.ts`
- Modify: `src/lib/electronApi.ts`
- Modify: `tests/main/taskStore.test.ts`
- Modify: `tests/main/taskExecution.integration.test.ts`
- Test: `tests/main/taskStore.test.ts`
- Test: `tests/main/taskExecution.integration.test.ts`

- [ ] **Step 1: Write the failing task-store snapshot test**

```ts
import { TaskStore } from '../../electron/main/services/taskStore';

describe('TaskStore snapshots', () => {
  it('returns one task summary plus ordered round details', () => {
    const store = new TaskStore(':memory:');
    const created = store.createTask({
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue',
      targetRounds: 2,
      perRoundTimeoutMs: 1000,
    });

    store.recordRound({
      taskId: created.taskId,
      roundNumber: 2,
      exitCode: 0,
      resultType: 'completed',
      lastMessage: 'done',
      durationMs: 2000,
    });
    store.recordRound({
      taskId: created.taskId,
      roundNumber: 1,
      exitCode: 0,
      resultType: 'completed',
      lastMessage: 'working',
      durationMs: 1000,
    });

    const snapshot = store.getTaskSnapshot(created.taskId);

    expect(snapshot.task.taskId).toBe(created.taskId);
    expect(snapshot.rounds.map((round) => round.roundNumber)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run the store test to verify the current read path is still incomplete for the renderer contract**

Run: `pnpm test tests/main/taskStore.test.ts`
Expected: FAIL because `taskSnapshotResponseSchema` is undefined and the renderer-facing snapshot contract does not exist yet

- [ ] **Step 3: Add shared snapshot schemas**

```ts
export const taskSnapshotResponseSchema = z.object({
  task: managedTaskSchema,
  rounds: z.array(managedTaskRoundSchema),
});

export type TaskSnapshotResponse = z.infer<typeof taskSnapshotResponseSchema>;
```

- [ ] **Step 4: Extend task IPC with `getSnapshot(taskId)`**

```ts
type TaskHandlersDeps = {
  createTask: (input: StartTaskInput) => Promise<{ taskId: string }>;
  runTask: (input: StartTaskInput & { taskId: string }) => Promise<void>;
  stopTask: (taskId: string) => Promise<void>;
  listActiveTasks: () => Promise<unknown[]>;
  getTaskSnapshot: (taskId: string) => Promise<unknown>;
};

export function createTaskHandlers(deps: TaskHandlersDeps) {
  return {
    start: async (input: StartTaskInput) => {
      const { taskId } = await deps.createTask(input);
      void deps.runTask({ ...input, taskId });
      return { taskId };
    },
    stop: async (taskId: string) => deps.stopTask(taskId),
    list: async () => deps.listActiveTasks(),
    getSnapshot: async (taskId: string) => deps.getTaskSnapshot(taskId),
  };
}
```

```ts
ipcMain.handle('tasks:getSnapshot', (_event, taskId) => taskHandlers.getSnapshot(taskId));
```

```ts
const electronApi = {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  getSessionTranscript: (rolloutPath: string) =>
    ipcRenderer.invoke('sessions:getTranscript', rolloutPath),
  startTask: (input: unknown) => ipcRenderer.invoke('tasks:start', input),
  stopTask: (taskId: string) => ipcRenderer.invoke('tasks:stop', taskId),
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  getTaskSnapshot: (taskId: string) => ipcRenderer.invoke('tasks:getSnapshot', taskId),
};
```

```ts
export async function getTaskSnapshot(taskId: string) {
  const api = getElectronApi();
  if (!api) {
    throw new Error('electronApi.getTaskSnapshot is unavailable');
  }

  return taskSnapshotResponseSchema.parse(await api.getTaskSnapshot(taskId));
}
```

- [ ] **Step 5: Update the focused integration test to cover the new handler**

```ts
it('returns a task snapshot through the handler contract', async () => {
  const snapshot = {
    task: { taskId: 'task-1', status: 'Completed' },
    rounds: [{ taskId: 'task-1', roundNumber: 1 }],
  };

  const handlers = createTaskHandlers({
    createTask: async () => ({ taskId: 'task-1' }),
    runTask: async () => undefined,
    stopTask: async () => undefined,
    listActiveTasks: async () => [],
    getTaskSnapshot: async () => snapshot,
  });

  await expect(handlers.getSnapshot('task-1')).resolves.toEqual(snapshot);
});
```

- [ ] **Step 6: Re-run the focused store and handler tests**

Run: `pnpm test tests/main/taskStore.test.ts tests/main/taskExecution.integration.test.ts`
Expected: PASS with snapshot ordering and IPC handler coverage

- [ ] **Step 7: Commit**

```bash
git add src/shared/schemas.ts electron/main/services/taskStore.ts electron/main/ipc/tasks.ts electron/main/index.ts electron/preload/index.ts src/lib/electronApi.ts tests/main/taskStore.test.ts tests/main/taskExecution.integration.test.ts
git commit -m "feat: expose managed task snapshots"
```

## Task 3: Add Failing Renderer Tests For The History Tab Workflow

**Files:**
- Create: `tests/renderer/managed-task-history.test.tsx`
- Modify: `tests/renderer/mvp-layout.test.tsx`
- Test: `tests/renderer/managed-task-history.test.tsx`
- Test: `tests/renderer/mvp-layout.test.tsx`

- [ ] **Step 1: Write the failing history-tab renderer test**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/app/App';

vi.mock('../../src/lib/electronApi', () => ({
  listSessions: vi.fn().mockResolvedValue({
    sessions: [
      {
        id: 'session-1',
        title: 'Continue',
        cwd: '/repo',
        rolloutPath: '/tmp/rollout.jsonl',
        updatedAt: 1776069276,
      },
    ],
  }),
  getSessionTranscript: vi.fn().mockResolvedValue({ entries: [] }),
  startTask: vi.fn().mockResolvedValue({ taskId: 'task-1' }),
  stopTask: vi.fn().mockResolvedValue(undefined),
  listTasks: vi.fn().mockResolvedValue([
    {
      taskId: 'task-1',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue',
      targetRounds: 2,
      completedRounds: 1,
      perRoundTimeoutMs: 1000,
      terminalBinding: null,
      status: 'Failed',
      lastExitCode: 1,
      lastStatusText: 'timed_out',
      startedAt: 1776069276,
      updatedAt: 1776069276,
    },
  ]),
  getTaskSnapshot: vi.fn().mockResolvedValue({
    task: {
      taskId: 'task-1',
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue',
      targetRounds: 2,
      completedRounds: 1,
      perRoundTimeoutMs: 1000,
      terminalBinding: null,
      status: 'Failed',
      lastExitCode: 1,
      lastStatusText: 'timed_out',
      startedAt: 1776069276,
      updatedAt: 1776069276,
    },
    rounds: [
      {
        taskId: 'task-1',
        roundNumber: 1,
        exitCode: 1,
        resultType: 'timed_out',
        lastMessage: 'Still working',
        durationMs: 1000,
      },
    ],
  }),
}));

describe('managed task history tab', () => {
  it('shows the latest task and its rounds after switching tabs', async () => {
    render(<App />);

    await screen.findByRole('button', { name: /托管历史/i });
    fireEvent.click(screen.getByRole('button', { name: /托管历史/i }));

    await waitFor(() => {
      expect(screen.getByText(/单轮超时/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/第 1 轮/i)).toBeInTheDocument();
    expect(screen.getByText(/Still working/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the renderer test to verify it fails**

Run: `pnpm test tests/renderer/managed-task-history.test.tsx`
Expected: FAIL because the history tab button and history panel do not exist yet

- [ ] **Step 3: Update the layout smoke test to require the new tab affordance**

```tsx
expect(screen.getByRole('button', { name: /对话记录/i })).toBeInTheDocument();
expect(screen.getByRole('button', { name: /托管历史/i })).toBeInTheDocument();
```

- [ ] **Step 4: Re-run the two renderer tests and keep them failing only on missing UI**

Run: `pnpm test tests/renderer/managed-task-history.test.tsx tests/renderer/mvp-layout.test.tsx`
Expected: FAIL only because the new history tab/panel is not implemented yet

- [ ] **Step 5: Commit**

```bash
git add tests/renderer/managed-task-history.test.tsx tests/renderer/mvp-layout.test.tsx
git commit -m "test: define managed task history tab behavior"
```

## Task 4: Implement The History Panel UI And Lower-Right Tabs

**Files:**
- Create: `src/features/tasks/TaskHistoryPanel.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/features/sessions/SessionTranscriptPanel.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/renderer/managed-task-history.test.tsx`
- Test: `tests/renderer/mvp-layout.test.tsx`

- [ ] **Step 1: Create the new history panel component**

```tsx
import { type ManagedTask, type ManagedTaskRound } from '../../shared/schemas';

type TaskHistoryPanelProps = {
  heading: string;
  emptyText: string;
  tasks: ManagedTask[];
  selectedTaskId: string | null;
  rounds: ManagedTaskRound[];
  onSelectTask: (taskId: string) => void;
  formatStatusDetail: (task: ManagedTask) => string;
};

export function TaskHistoryPanel(props: TaskHistoryPanelProps) {
  if (props.tasks.length === 0) {
    return <p className="history-empty">{props.emptyText}</p>;
  }

  return (
    <section className="task-history-panel" data-testid="task-history-panel">
      <div className="task-history-list">
        {props.tasks.map((task) => (
          <button
            key={task.taskId}
            type="button"
            className={
              task.taskId === props.selectedTaskId
                ? 'task-history-row selected'
                : 'task-history-row'
            }
            onClick={() => props.onSelectTask(task.taskId)}
          >
            <strong>{task.cwd}</strong>
            <span>{task.completedRounds}/{task.targetRounds}</span>
            <span>{props.formatStatusDetail(task)}</span>
          </button>
        ))}
      </div>
      <div className="task-history-rounds">
        {props.rounds.map((round) => (
          <article key={`${round.taskId}-${round.roundNumber}`} className="history-round-card">
            <h3>{`第 ${round.roundNumber} 轮`}</h3>
            <p>{round.resultType}</p>
            <p>{round.lastMessage}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add lower-right tab state and history data loading in `App.tsx`**

```tsx
const [detailTab, setDetailTab] = useState<'transcript' | 'history'>('transcript');
const [historyTasks, setHistoryTasks] = useState<ManagedTask[]>([]);
const [selectedHistoryTaskId, setSelectedHistoryTaskId] = useState<string | null>(null);
const [selectedHistorySnapshot, setSelectedHistorySnapshot] =
  useState<TaskSnapshotResponse | null>(null);

useEffect(() => {
  if (detailTab !== 'history') {
    return;
  }

  void listTasks().then((tasks) => {
    setHistoryTasks(tasks);
    const nextTaskId = selectedHistoryTaskId ?? tasks[0]?.taskId ?? null;
    setSelectedHistoryTaskId(nextTaskId);
  });
}, [detailTab, selectedHistoryTaskId]);

useEffect(() => {
  if (!selectedHistoryTaskId) {
    setSelectedHistorySnapshot(null);
    return;
  }

  void getTaskSnapshot(selectedHistoryTaskId).then(setSelectedHistorySnapshot);
}, [selectedHistoryTaskId]);
```

- [ ] **Step 3: Replace the lower-right single panel with a tab switcher**

```tsx
<section className="detail-panel surface-card">
  <div className="detail-panel-tabs" role="tablist" aria-label="Task Detail Tabs">
    <button
      type="button"
      className={detailTab === 'transcript' ? 'detail-tab active' : 'detail-tab'}
      onClick={() => setDetailTab('transcript')}
    >
      {copy.transcriptHeading}
    </button>
    <button
      type="button"
      className={detailTab === 'history' ? 'detail-tab active' : 'detail-tab'}
      onClick={() => setDetailTab('history')}
    >
      {copy.taskHistoryHeading}
    </button>
  </div>

  {detailTab === 'transcript' ? (
    <SessionTranscriptPanel
      heading={copy.transcriptHeading}
      emptyText={copy.transcriptEmpty}
      entries={transcriptEntries}
      nested
    />
  ) : (
    <TaskHistoryPanel
      heading={copy.taskHistoryHeading}
      emptyText={copy.taskHistoryEmpty}
      tasks={historyTasks}
      selectedTaskId={selectedHistoryTaskId}
      rounds={selectedHistorySnapshot?.rounds ?? []}
      onSelectTask={setSelectedHistoryTaskId}
      formatStatusDetail={(task) =>
        getStatusDetailText(task, copy) || copy.taskStates[task.status as keyof typeof copy.taskStates]
      }
    />
  )}
</section>
```

- [ ] **Step 4: Add the minimal supporting copy and styles**

```ts
taskHistoryHeading: '托管历史',
taskHistoryEmpty: '当前还没有可展示的托管记录。',
```

```css
.detail-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-panel-tabs {
  display: inline-flex;
  gap: 8px;
  margin-bottom: 14px;
}

.detail-tab {
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: var(--color-surface-low);
  font: inherit;
  cursor: pointer;
}

.detail-tab.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-container));
  color: white;
}

.task-history-panel {
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
  min-height: 0;
}
```

- [ ] **Step 5: Re-run the focused renderer tests to verify they pass**

Run: `pnpm test tests/renderer/managed-task-history.test.tsx tests/renderer/mvp-layout.test.tsx`
Expected: PASS with the transcript tab as default and history visible after switching

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/TaskHistoryPanel.tsx src/app/App.tsx src/features/sessions/SessionTranscriptPanel.tsx src/styles/app.css tests/renderer/managed-task-history.test.tsx tests/renderer/mvp-layout.test.tsx
git commit -m "feat: add managed task history tab"
```

## Task 5: Preserve Timeout Detail And Verify Cleanup + History Together

**Files:**
- Modify: `tests/renderer/managed-task-flow.test.tsx`
- Modify: `tests/main/taskExecution.integration.test.ts`
- Modify: `src/app/App.tsx`
- Test: `tests/renderer/managed-task-flow.test.tsx`
- Test: `tests/main/taskExecution.integration.test.ts`
- Test: `pnpm test`

- [ ] **Step 1: Extend the renderer flow test so timeout detail survives into history**

```tsx
it('shows timeout detail in the history tab after polling task records', async () => {
  render(<App />);

  await screen.findByText(/^repo$/i);
  fireEvent.click(screen.getByRole('button', { name: /自动托管/i }));
  fireEvent.click(screen.getByRole('button', { name: /托管历史/i }));

  await waitFor(() => {
    expect(screen.getByText(/单轮超时/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Keep `tasks:start` backgrounded while adding `getSnapshot` support to the integration test**

```ts
it('starts in the background and serves snapshot reads', async () => {
  const handlers = createTaskHandlers({
    createTask: async () => ({ taskId: 'task-1' }),
    runTask: async () => undefined,
    stopTask: async () => undefined,
    listActiveTasks: async () => [{ taskId: 'task-1', status: 'Completed' }],
    getTaskSnapshot: async () => ({
      task: { taskId: 'task-1', status: 'Completed' },
      rounds: [],
    }),
  });

  await expect(
    handlers.start({
      sessionId: 'session-1',
      cwd: '/repo',
      fixedPrompt: 'Continue',
      targetRounds: 2,
      perRoundTimeoutMs: 1000,
    }),
  ).resolves.toEqual({ taskId: 'task-1' });

  await expect(handlers.getSnapshot('task-1')).resolves.toEqual({
    task: { taskId: 'task-1', status: 'Completed' },
    rounds: [],
  });
});
```

- [ ] **Step 3: Re-run the focused flow tests**

Run: `pnpm test tests/main/taskExecution.integration.test.ts tests/renderer/managed-task-flow.test.tsx`
Expected: PASS with timeout detail still visible and start remaining non-blocking

- [ ] **Step 4: Run the full verification suite**

Run: `pnpm test && pnpm typecheck`
Expected: all tests PASS and `tsc --noEmit` exits 0

- [ ] **Step 5: Commit**

```bash
git add tests/renderer/managed-task-flow.test.tsx tests/main/taskExecution.integration.test.ts src/app/App.tsx
git commit -m "feat: preserve managed task history after cleanup"
```
