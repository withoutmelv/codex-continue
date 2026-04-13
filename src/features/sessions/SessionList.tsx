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

export function SessionList({
  sessions,
  selectedSessionId,
}: SessionListProps) {
  return (
    <section className="surface-block">
      <h2>Session Library</h2>
      <div className="session-list">
        {sessions.map((session) => (
          <article
            key={session.id}
            className={
              session.id === selectedSessionId
                ? 'session-card selected'
                : 'session-card'
            }
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
