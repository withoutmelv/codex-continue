import { type SessionSummary } from '../../shared/schemas';
import { useMemo, useState } from 'react';
import { formatSessionTimestamp } from './formatSessionTimestamp';

function getProjectName(cwd: string) {
  const segments = cwd.split(/[\\/]/).filter(Boolean);
  return segments.at(-1) ?? cwd;
}

type SessionListProps = {
  heading: string;
  emptyText: string;
  refreshLabel: string;
  sortHint: string;
  searchLabel: string;
  searchPlaceholder: string;
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
  sortHint,
  searchLabel,
  searchPlaceholder,
  locale,
  sessions,
  selectedSessionId,
  onSelect,
  onRefresh,
}: SessionListProps) {
  const [query, setQuery] = useState('');
  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return sessions;
    }

    return sessions.filter((session) =>
      getProjectName(session.cwd).toLowerCase().includes(normalizedQuery),
    );
  }, [query, sessions]);

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
      <div className="sidebar-meta">
        <label className="sidebar-search">
          <span className="sidebar-search-label">{searchLabel}</span>
          <input
            aria-label={searchLabel}
            className="sidebar-search-input"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <p className="sidebar-sort-hint">{sortHint}</p>
      </div>
      <div className="session-list" data-testid="session-scroll-region">
        {filteredSessions.length === 0 ? (
          <p className="session-empty">{emptyText}</p>
        ) : (
          filteredSessions.map((session) => (
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
                  {getProjectName(session.cwd)}
                </strong>
                <span className="session-meta">
                  {formatSessionTimestamp(session.updatedAt)}
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
