import { type SessionSummary } from '../../shared/schemas';

type SessionListProps = {
  heading: string;
  emptyText: string;
  locale: 'en' | 'zh';
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
};

export function SessionList({
  heading,
  emptyText,
  locale,
  sessions,
  selectedSessionId,
  onSelect,
}: SessionListProps) {
  return (
    <section className="surface-block session-sidebar" data-testid="session-sidebar">
      <h2>{heading}</h2>
      <div className="session-list" data-testid="session-scroll-region">
        {sessions.length === 0 ? (
          <p className="session-empty">{emptyText}</p>
        ) : (
          sessions.map((session) => (
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
              <span>
                {new Date(session.updatedAt).toLocaleString(
                  locale === 'zh' ? 'zh-CN' : 'en-US',
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
