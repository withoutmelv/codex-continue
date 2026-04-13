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
