import { useEffect, useState } from 'react';
import { TaskConfigForm } from '../features/tasks/TaskConfigForm';
import { TaskStatusPanel } from '../features/tasks/TaskStatusPanel';
import { SessionList } from '../features/sessions/SessionList';
import {
  listSessions,
  listTasks,
  startTask,
  stopTask,
} from '../lib/electronApi';
import { type SessionSummary } from '../shared/schemas';

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

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null;

  async function refreshSessions() {
    const response = await listSessions();
    setSessions(response.sessions);
    setSelectedSessionId((current) => current ?? response.sessions[0]?.id ?? null);
  }

  useEffect(() => {
    void refreshSessions();
    void listTasks();
  }, []);

  async function handleStart() {
    if (!selectedSession) {
      return;
    }

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
    if (!activeTaskId) {
      return;
    }

    await stopTask(activeTaskId);
    setTaskState('Stopped');
  }

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
        <SessionList
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={setSelectedSessionId}
        />
        <div className="main-stack">
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
          <TaskStatusPanel
            state={taskState}
            activeTaskId={activeTaskId}
            onStop={handleStop}
          />
        </div>
      </section>
    </main>
  );
}
