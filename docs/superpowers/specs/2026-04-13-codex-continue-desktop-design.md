# Codex Continue Desktop Design

## Overview

This project is a cross-platform desktop application for taking over existing Codex CLI conversations on the local machine.

The first release is intentionally narrow. The app reads locally persisted Codex sessions, lets the user select one existing session, and runs repeated `codex exec resume` rounds against that session using a fixed prompt and a configured send count. Each managed task is attached to one reusable native terminal window so the user can inspect raw Codex output directly.

The visual system must follow [DESIGN.md](/Users/withoutmelv/work/continue-app/DESIGN.md), specifically the "Azure Clarity" direction: light editorial surfaces, layered blue tonal hierarchy, no hard 1px section dividers, glass-like terminal treatment, and Manrope + Inter typography.

## Product Goal

Provide a reliable local control surface for "automatic hosting" of an existing Codex session after the user steps away, while preserving visibility into the real CLI execution through a native terminal window.

## Success Criteria

- The app can list existing local Codex sessions with enough metadata for the user to choose the right one.
- The user can configure a fixed prompt, round count, and per-round timeout.
- Clicking `Auto Host` starts a managed task against the selected session.
- The app repeatedly runs `codex exec resume <session_id> "<prompt>" --json` until the configured round count is reached, the user stops the task, or a failure condition occurs.
- One managed task is bound to one native terminal window, and all rounds for that task appear in that same terminal window.
- The app shows round progress, current state, last exit status, and recent execution history.

## Confirmed Constraints

- Local single-user only
- Existing Codex sessions only
- No cloud continuation
- No remote task execution
- No session deletion in v1
- No session hiding/archive in v1
- No "start new chat" in v1
- Fixed prompt only in v1, no template variables
- One native terminal window per managed task
- Each round reuses the same `session_id`
- Serial execution only; no parallel rounds for the same task

## User Flow

1. The app loads the local Codex session list on startup.
2. The user selects one existing session from the list.
3. The user enters:
   - fixed prompt text
   - target send count
   - per-round timeout
4. The user clicks `Auto Host`.
5. The app creates a managed task and opens one native terminal window for that task.
6. The app starts round 1 by executing `codex exec resume <session_id> "<prompt>" --json`.
7. The app waits for round completion.
8. If the round completes successfully and the send count has not been reached, the app starts the next round against the same session.
9. The user can click `Stop` at any time to halt further rounds.

## MVP Scope

### In Scope

- Desktop UI for session selection and managed task control
- Read-only session discovery from local Codex data
- Managed execution loop for repeated `codex exec resume`
- One native terminal window per managed task
- Round status tracking
- Stop action
- Manual session refresh
- Local app-owned persistence for managed task state and logs

### Out of Scope

- Creating new Codex sessions
- Deleting or hiding sessions
- Editing or mutating Codex internal session storage
- Multi-user support
- Remote execution
- Background daemon mode outside the desktop app
- Prompt templating
- Automatic session inference without explicit user selection
- Multiple simultaneous managed tasks in v1

## Architecture

The application should be built as an Electron desktop app with a Node-based orchestration layer.

Electron is the recommended v1 stack because the app needs all of the following in one process model:

- cross-platform desktop packaging
- local SQLite access
- local filesystem access
- CLI process spawning
- native terminal integration
- structured JSONL parsing for Codex exec events

The system is composed of four focused modules.

### 1. Session Provider

Responsibility:
- Read persisted local Codex session metadata
- Normalize it into app-facing session rows

Inputs:
- `~/.codex/state_5.sqlite`
- `threads` table

Fields needed:
- `id`
- `cwd`
- `title`
- `updated_at`
- `rollout_path`
- `archived`

Behavior:
- Only read local Codex state
- Exclude archived sessions by default
- Sort by `updated_at` descending
- Provide manual refresh capability

### 2. Task Orchestrator

Responsibility:
- Create and drive one managed task state machine
- Track round count, status, timeout, and stop requests

Behavior:
- Bind the chosen `session_id`, `cwd`, prompt, and round count at task start
- Run rounds serially
- Never overlap two rounds for the same task
- Stop when:
  - configured round count is reached
  - user clicks `Stop`
  - launch fails
  - timeout occurs
  - process exits non-zero

### 3. Terminal Runner

Responsibility:
- Open and reuse one native terminal window per managed task
- Execute each round inside that same terminal-linked execution context

Behavior:
- Terminal must show the real Codex output
- Terminal window should remain attached across rounds
- The app should not open a new terminal window for every round

### 4. App Store

Responsibility:
- Persist app-owned task state and execution history
- Avoid mutating Codex internal storage

Behavior:
- Maintain local records for managed tasks
- Cache recent round results
- Persist enough state to render status after app reload

## Data Sources

### Codex-Owned Data

Read only:
- `~/.codex/state_5.sqlite`
- `~/.codex/sessions/**/rollout-*.jsonl`

Usage:
- session discovery
- session metadata lookup
- optional deeper inspection later if needed

### App-Owned Data

Recommended location:
- app-specific SQLite file under the user's application data directory

Suggested tables:

#### `managed_tasks`

- `task_id`
- `session_id`
- `cwd`
- `fixed_prompt`
- `target_rounds`
- `completed_rounds`
- `per_round_timeout_ms`
- `status`
- `terminal_binding`
- `last_exit_code`
- `last_status_text`
- `started_at`
- `updated_at`

#### `managed_task_rounds`

- `round_id`
- `task_id`
- `round_number`
- `started_at`
- `finished_at`
- `exit_code`
- `result_type`
- `last_message`
- `duration_ms`

## Execution Model

Each managed round should run the non-interactive Codex path, not the interactive TUI path.

Command model:

```bash
codex exec resume <session_id> "<fixed_prompt>" --json
```

Important design assumptions already validated during brainstorming:

- `codex exec resume` continues the same session/thread context
- later `resume` rounds can access prior `resume` round context
- round completion can be observed through JSONL events plus process exit

The app should always bind execution to the selected session's `cwd`, or to the user-confirmed execution directory if that becomes configurable later. In v1, use the session `cwd`.

## Round Completion Rule

The app should treat a round as completed only when both of the following are true:

1. a `turn.completed` event has been observed in the JSONL stream
2. the `codex exec resume` process exits

Then evaluate the exit outcome:

- exit code `0` -> round succeeded
- exit code non-zero -> round failed
- timeout before clean exit -> round failed

This rule is intentionally operational, not semantic. It means "the CLI round finished," not "the underlying user task is fully complete."

## Prompt Contract

Because long-running sessions may compress earlier context, the fixed prompt should include the core operating rule every round instead of assuming Codex will always perfectly retain earlier instructions.

Recommended v1 guidance for the fixed prompt:

- continue the current task
- do not stop unless truly blocked
- end with a machine-readable status marker

Recommended status markers:

- `STATUS: DONE`
- `STATUS: NEEDS_INPUT`
- `STATUS: BLOCKED`
- `STATUS: RETRY`

The app should parse the final assistant message to extract one of these status markers when present. If no marker is found, the app should store `unknown_result` for that round.

## State Machine

Managed task states:

- `Idle`
- `Ready`
- `LaunchingTerminal`
- `RunningRound`
- `RoundFinished`
- `Completed`
- `Stopped`
- `Failed`

Definitions:

- `Idle`: no valid session/config selected
- `Ready`: valid config entered, waiting for `Auto Host`
- `LaunchingTerminal`: task created, native terminal is being prepared
- `RunningRound`: one `codex exec resume` process is active
- `RoundFinished`: current round ended and the orchestrator is deciding whether to continue
- `Completed`: target round count reached
- `Stopped`: user-initiated stop or terminal intentionally closed
- `Failed`: execution error, timeout, or abnormal exit

## Native Terminal Strategy

The design requires one native terminal window per managed task, reused across all rounds of that task.

This should not be implemented as "open a fresh terminal and forget it." The app still needs orchestration control.

Recommended strategy:

- create a terminal adapter interface
- create a per-task runner entrypoint
- launch that runner inside the native terminal window
- let the app communicate round requests to that runner

This preserves both:

- real terminal visibility for the user
- app-level control over task lifecycle

### Cross-Platform Adapter Plan

Architecture target:
- macOS adapter
- Windows adapter
- Linux adapter

Product target:
- the app is intended to ship on macOS, Windows, and Linux

Implementation sequencing:
- validate the terminal adapter contract on macOS `Terminal.app` first
- then implement Windows and Linux adapters against the same boundary

Reason:
- the product requirement is cross-platform
- terminal control behavior differs significantly by platform
- the design should preserve one shared orchestration model while allowing adapter-specific execution details

This keeps the product scope aligned with the original three-platform goal while still giving the implementation plan a sane order of work.

## UI Design

The UI must follow the `Azure Clarity` system defined in [DESIGN.md](/Users/withoutmelv/work/continue-app/DESIGN.md).

### Visual Rules

- Light layered blue-white editorial workspace
- No obvious hard separators between list rows or sections
- Use tonal surface hierarchy for containment
- Use generous spacing to reduce cognitive noise
- Use Manrope for display/section hierarchy and Inter for body text
- Use a blue gradient primary action for `Auto Host`
- Treat the terminal presentation as a glass-like floating surface

### Screen Structure

#### Left Pane: Session Library

Purpose:
- browse and select existing Codex sessions

Contents:
- session id fragment
- title or first meaningful prompt text
- cwd
- updated timestamp

Rules:
- read-only list
- no delete action
- no hide action
- no new chat action

#### Main Control Pane

Purpose:
- configure and start one managed task

Contents:
- selected session
- fixed prompt input
- send count
- per-round timeout
- `Auto Host`
- `Stop`
- `Refresh Sessions`

#### Status Area

Purpose:
- communicate progress without making the terminal the only source of truth

Contents:
- current task state
- current round / total rounds
- last exit code
- last parsed status marker
- recent rounds history

#### Terminal Presentation

Purpose:
- indicate that the real execution happens in one reusable native terminal window

Rules:
- the desktop app may mirror summary information
- the real CLI output belongs to the system terminal window

## Error Handling

### Session Read Errors

- If local Codex state cannot be opened, show a clear read failure state
- Do not fabricate session data
- Allow retry with `Refresh Sessions`

### Terminal Launch Errors

- If native terminal launch fails, do not start the managed task
- Surface the platform-specific failure message
- Leave the task in `Failed`

### Execution Failures

- Non-zero exit code -> `Failed`
- Timeout -> `Failed`
- Missing `turn.completed` before exit -> `Failed`
- Unable to parse final status marker -> round success with `unknown_result`

### Stop Behavior

- User clicking `Stop` prevents any future round from starting
- If a round is currently active, terminate it and mark the task `Stopped`

## Testing Strategy

### Unit Tests

- session normalization from Codex SQLite rows
- round completion parsing from JSONL events
- status marker extraction from final message
- task state machine transitions
- stop behavior during and between rounds

### Integration Tests

- start managed task against a stubbed runner
- verify repeated rounds stop at configured count
- verify non-zero exit transitions to `Failed`
- verify timeout transitions to `Failed`
- verify task can be manually stopped

### Manual Tests

- load real local Codex sessions
- select session and start managed task
- verify one native terminal window opens
- verify multiple rounds run in that same terminal window
- verify terminal output is visible to the user
- verify UI state matches observed terminal activity

## Open Implementation Risk

The main risk is native terminal reuse across platforms. The application needs to preserve one-window-per-task behavior without giving up orchestration control.

This is manageable if terminal integration is isolated behind an adapter boundary from the start.

## Final MVP Definition

The first release is a local desktop controller for repeated `codex exec resume` against one existing Codex session, driven by a fixed prompt and a finite round count, with one reusable native terminal window showing the real CLI output.
