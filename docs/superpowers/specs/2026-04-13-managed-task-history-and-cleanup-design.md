# Managed Task History And Cleanup Design

## Overview

This design extends the existing Codex Continue Desktop application with two tightly related capabilities:

1. automatic cleanup of per-task temporary directories after a managed task reaches a terminal state
2. a new "Managed Task History" view inside the current UI so the user can inspect persisted task and round summaries after cleanup has occurred

The key design constraint is that these two features must reinforce each other rather than fight each other. Because the user chose immediate cleanup, the long-term history view must rely on app-owned persisted summary data in `app.sqlite`, not on leftover temporary files.

This work builds on the existing Electron + SQLite architecture and preserves the current "Azure Clarity" interface direction from [DESIGN.md](/Users/withoutmelv/work/continue-app/DESIGN.md).

## Product Goal

Let the user review prior automatic-hosting runs without retaining stale per-task temporary directories on disk.

## Success Criteria

- A managed task's temporary directory is automatically deleted after the task becomes `Completed`, `Failed`, or `Stopped`.
- The cleanup does not race with the runner's final result write.
- The app still shows historical task and round summaries after cleanup.
- The lower-right area of the UI can switch between `Conversation History` and `Managed Task History`.
- The history view presents task-level records and round-level detail in one focused workflow.
- Timeouts remain distinguishable from generic process failures in the persisted history UI.

## Confirmed Decisions

- Cleanup policy: delete the task temp directory immediately after terminal completion.
- History layout: use a tab switcher in the lower-right panel, not a new always-visible pane.
- Managed task history structure: two-level view.
  - left side: managed task records
  - right side: round details for the selected task
- Default lower-right tab remains `Conversation History` to preserve the current workflow.
- Default selected historical task is the most recently updated task.
- The default history UI does not expose raw temp files or raw terminal output logs.

## Scope

### In Scope

- temp-directory cleanup for terminal managed tasks
- one new task snapshot IPC/read path
- task list reuse for current-state polling and history navigation
- right-lower-panel tab switcher between transcript and managed task history
- historical task list UI
- per-task round detail UI
- empty states for no history and no rounds
- tests covering cleanup, persistence after cleanup, and history UI behavior

### Out of Scope

- restoring deleted raw log files from temp storage
- exporting task history
- deleting history records from `app.sqlite`
- filtering or searching history in this pass
- preserving different cleanup behavior for success vs failure
- background archival to another file format

## Why This Design

The user explicitly wants immediate temp cleanup and a usable history panel. That rules out any UI design that depends on request files, control files, or raw temp logs remaining on disk after completion.

The chosen design keeps the storage contract clean:

- temporary execution artifacts live under `os.tmpdir()/codex-continue/<taskId>` and are disposable
- durable app-facing history lives in `app.sqlite`

This split makes the cleanup semantics predictable and keeps future UI work grounded in persisted summary records rather than incidental filesystem leftovers.

## User Experience

## Lower-Right Panel

The existing lower-right panel becomes a tabbed panel with two tabs:

- `Conversation History`
- `Managed Task History`

Behavior:

- default selected tab on app load: `Conversation History`
- selected tab stays local to the current window session; no persistence required in this iteration
- switching tabs does not affect the running task itself

## Managed Task History Tab

The tab content is a two-column detail flow.

### Left Column: Task Records

Each task row shows:

- project or cwd-derived label
- task status
- started or updated time
- completed rounds / target rounds
- per-round timeout
- terminal status detail when relevant

Status mapping should remain user-facing and specific:

- `Completed`
- `Stopped`
- `Failed` with detail labels such as:
  - `Round Timed Out`
  - `Process Error`
  - `Runtime Error`

Sorting:

- newest first by `updatedAt desc`

Selection:

- automatically select the first row when history exists
- selecting another row updates the round-detail column immediately

### Right Column: Round Details

For the selected task, show one row/card per round with:

- round number
- result type
- duration
- exit code
- final assistant message captured for that round

This column is read-only.

### Empty States

- If there are no managed task records, show a dedicated history empty state.
- If a selected task has no stored rounds, show an explanatory empty state in the detail column.

## Data Model

The existing SQLite tables remain the durable source of truth:

### `managed_tasks`

Already stores:

- task identity and binding metadata
- fixed prompt
- round counts
- timeout
- terminal state
- last exit and last status text
- started and updated timestamps

No schema expansion is required for the first version of this feature.

### `managed_task_rounds`

Already stores:

- round number
- exit code
- result type
- last message
- duration
- started and finished timestamps

No schema expansion is required for the first version of this feature.

## Temporary Files

Current temp structure under `os.tmpdir()/codex-continue/<taskId>` remains unchanged while a task is active:

- `requests/*.json`
- `results/*.json`
- `results/*.output.log`
- `control/stop`

These remain runtime coordination artifacts only. They are not part of the long-term UI contract.

## Runtime Cleanup Design

## Cleanup Trigger

Cleanup happens only after the managed task has reached a true terminal outcome in the runtime layer:

- `Completed`
- `Failed`
- `Stopped`

Cleanup must not happen in the early stop-request path itself, because `stopTask()` currently signals the runner before the child process has necessarily exited and before the final result may have been persisted.

## Cleanup Ordering

The required order is:

1. runner finishes or stop sequence resolves to a terminal outcome
2. final task status and round summaries are written to `app.sqlite`
3. runtime performs best-effort deletion of `os.tmpdir()/codex-continue/<taskId>`
4. runtime removes in-memory orchestrator references

This ordering prevents a race where temp files disappear before the final result JSON has been consumed and persisted.

## Cleanup Failure Behavior

Cleanup failure must not rewrite a successful or failed task into another product state.

Required behavior:

- task terminal state remains whatever the orchestration outcome already determined
- temp-directory deletion is best effort
- cleanup failure is logged for diagnostics
- no user-facing cleanup error surface is required in this iteration

This keeps the product semantics focused on task execution rather than storage housekeeping.

## IPC And Read Paths

## Existing `tasks:list`

`tasks:list` continues to return task summary rows and is reused for two purposes:

- current managed-task state polling in the top-right control panel
- left-column history list in the `Managed Task History` tab

This keeps one summary query shape for "all tasks".

## New Task Snapshot Endpoint

Add a focused read path for one task's full snapshot, for example:

- `tasks:getSnapshot(taskId)`

Response should include:

- the selected task summary
- all stored rounds for that task ordered by ascending round number

This endpoint powers the right-column round detail view and avoids stuffing all rounds for all tasks into `tasks:list`.

## Renderer State Flow

## Top-Right Control Panel

The current running-task polling remains in place. It can continue using `tasks:list` to refresh status for the active task id.

## Lower-Right Tab State

Renderer state additions:

- selected lower-right tab
- history task list
- selected history task id
- selected task snapshot payload
- history loading / empty state

Recommended behavior:

- load task list when switching into `Managed Task History`
- select the most recent task automatically if no prior selection exists
- fetch that task's snapshot on selection
- keep transcript fetching separate from history fetching

## Error Handling

### Task Outcome Semantics

- `timed_out` remains a first-class result detail
- `process_error` remains separate
- `runtime_error` remains separate
- `Stopped` is not displayed as a failure

### History Availability

Because temp files are deleted immediately after terminal completion:

- history UI must never link to raw temp files
- round details must come entirely from persisted SQLite records

If a catastrophic failure occurs before a round is recorded, the history UI may show a failed task with partial or zero rounds. That is acceptable and truthful.

## Testing Strategy

At minimum, add tests for:

1. cleanup after terminal states
   - completed task deletes temp directory
   - failed task deletes temp directory
   - stopped task deletes temp directory
   - active task temp directory is not deleted prematurely

2. persistence after cleanup
   - task summary remains readable after temp deletion
   - round summary remains readable after temp deletion

3. snapshot query behavior
   - `tasks:getSnapshot(taskId)` returns task + rounds in the expected order

4. renderer history interaction
   - lower-right tab switches from transcript to history
   - most recent task auto-selects
   - selecting a task updates round detail
   - empty history shows an empty state

5. status detail rendering
   - timeout displays as `单轮超时` / `Round Timed Out`
   - stopped tasks do not render as failures

## Implementation Notes

- Prefer reusing existing `TaskStore.getTaskSnapshot()` for the new detail IPC path.
- Add a runtime-local helper to remove the temp task directory with `fs.rmSync(..., { recursive: true, force: true })` or the async equivalent, depending on the surrounding implementation style.
- Keep cleanup responsibility inside the runtime layer where task execution lifecycle is already centralized.
- Keep the new history UI aligned with the current card-based panel system rather than introducing a new shell layout.

## Open Questions

None. The required UX shape, cleanup policy, and data-retention boundary were all explicitly chosen during brainstorming.
