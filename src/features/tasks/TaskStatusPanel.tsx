type TaskStatusPanelProps = {
  state: string;
  activeTaskId: string | null;
  onStop: () => void;
};

export function TaskStatusPanel({
  state,
  activeTaskId,
  onStop,
}: TaskStatusPanelProps) {
  return (
    <section className="status-grid">
      <article className="surface-card">
        <h2>Task Status</h2>
        <p>{state}</p>
        <button
          className="secondary-button"
          disabled={!activeTaskId}
          onClick={onStop}
        >
          Stop
        </button>
      </article>
      <article className="terminal-glass">
        <h2>Native Terminal Window</h2>
        <pre className="terminal-shell">
          <code>
            {activeTaskId
              ? `$ task ${activeTaskId} running in native terminal`
              : '$ idle'}
          </code>
        </pre>
      </article>
    </section>
  );
}
