type TaskStatusPanelProps = {
  copy: {
    taskStatus: string;
    nativeTerminalWindow: string;
    stop: string;
    idleTerminal: string;
    taskRunning: (taskId: string) => string;
  };
  stateLabel: string;
  activeTaskId: string | null;
  onStop: () => void;
};

export function TaskStatusPanel({
  copy,
  stateLabel,
  activeTaskId,
  onStop,
}: TaskStatusPanelProps) {
  return (
    <section className="status-grid">
      <article className="surface-card">
        <h2>{copy.taskStatus}</h2>
        <p>{stateLabel}</p>
        <button
          className="secondary-button"
          disabled={!activeTaskId}
          onClick={onStop}
        >
          {copy.stop}
        </button>
      </article>
      <article className="terminal-glass">
        <h2>{copy.nativeTerminalWindow}</h2>
        <pre className="terminal-shell">
          <code>
            {activeTaskId
              ? copy.taskRunning(activeTaskId)
              : copy.idleTerminal}
          </code>
        </pre>
      </article>
    </section>
  );
}
