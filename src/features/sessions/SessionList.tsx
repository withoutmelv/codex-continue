import { type SessionSummary } from '../../shared/schemas';

type SessionListProps = {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
};

export function SessionList({
  sessions,
  selectedSessionId,
  onSelect,
}: SessionListProps) {
  return (
    <section className="surface-block">
      <h2>Session Library</h2>
      <div className="session-list">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            className={
              session.id === selectedSessionId
                ? 'session-card selected'
                : 'session-card'
            }
            onClick={() => onSelect(session.id)}
          >
            <strong>{session.id.slice(0, 12)}...</strong>
            <p>{session.title}</p>
            <small>{session.cwd}</small>
            <span>{new Date(session.updatedAt).toLocaleString()}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
