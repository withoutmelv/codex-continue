import { type SessionTranscriptEntry } from '../../shared/schemas';

type SessionTranscriptPanelProps = {
  heading: string;
  emptyText: string;
  entries: SessionTranscriptEntry[];
  nested?: boolean;
};

export function SessionTranscriptPanel(props: SessionTranscriptPanelProps) {
  return (
    <section
      className={
        props.nested ? 'transcript-panel transcript-panel-nested' : 'surface-card transcript-panel'
      }
      data-testid="transcript-panel"
    >
      <div className="transcript-header">
        <h2>{props.heading}</h2>
      </div>
      <div className="transcript-list" data-testid="transcript-scroll-region">
        {props.entries.length === 0 ? (
          <p className="transcript-empty">{props.emptyText}</p>
        ) : (
          props.entries.map((entry) => (
            <article
              key={entry.id}
              className={
                entry.role === 'user'
                  ? 'transcript-entry transcript-entry-user'
                  : 'transcript-entry transcript-entry-assistant'
              }
            >
              <div className="transcript-role">
                {entry.role === 'user' ? 'USER' : 'ASSISTANT'}
              </div>
              <p className="transcript-message">{entry.message}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
