import { type SessionSummary } from '../../shared/schemas';

type SessionListProps = {
  heading: string;
  emptyText: string;
  refreshLabel: string;
  locale: 'en' | 'zh';
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onRefresh: () => void;
};

export function SessionList({
  heading,
  emptyText,
  refreshLabel,
  locale,
  sessions,
  selectedSessionId,
  onSelect,
  onRefresh,
}: SessionListProps) {
  return (
    <section className="surface-block session-sidebar" data-testid="session-sidebar">
      <div className="sidebar-header">
        <h2>{heading}</h2>
        <button
          type="button"
          className="secondary-button sidebar-action"
          onClick={onRefresh}
        >
          {refreshLabel}
        </button>
      </div>
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
              <div className="session-topline">
                <strong className="session-title-text">
                  {session.title.trim() || `${session.id.slice(0, 8)}...`}
                </strong>
                <span className="session-meta">
                  {new Date(session.updatedAt).toLocaleDateString(
                    locale === 'zh' ? 'zh-CN' : 'en-US',
                    { month: 'numeric', day: 'numeric' },
                  )}
                </span>
              </div>
              <small className="session-id-text">{session.id.slice(0, 8)}...</small>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
