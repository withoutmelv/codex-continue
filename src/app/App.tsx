import { SessionList } from '../features/sessions/SessionList';
import { TaskConfigForm } from '../features/tasks/TaskConfigForm';
import { TaskStatusPanel } from '../features/tasks/TaskStatusPanel';

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
        <SessionList
          sessions={demoSessions}
          selectedSessionId={demoSessions[0].id}
        />
        <div className="main-stack">
          <TaskConfigForm />
          <TaskStatusPanel />
        </div>
      </section>
    </main>
  );
}
