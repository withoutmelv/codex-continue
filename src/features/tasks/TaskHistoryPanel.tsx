import { type ManagedTask, type ManagedTaskRound } from '../../shared/schemas';

type TaskHistoryPanelProps = {
  tasks: ManagedTask[];
  selectedTaskId: string | null;
  rounds: ManagedTaskRound[];
  emptyText: string;
  noRoundsText: string;
  locale: 'en' | 'zh';
  onSelectTask: (taskId: string) => void;
  formatTaskTitle: (cwd: string) => string;
  formatTaskUpdatedAt: (updatedAt: number) => string;
  formatTaskStatus: (task: ManagedTask) => string;
};

function formatRoundHeading(roundNumber: number, locale: 'en' | 'zh') {
  return locale === 'zh' ? `第 ${roundNumber} 轮` : `Round ${roundNumber}`;
}

export function TaskHistoryPanel(props: TaskHistoryPanelProps) {
  if (props.tasks.length === 0) {
    return <p className="history-empty">{props.emptyText}</p>;
  }

  return (
    <section className="task-history-panel" data-testid="task-history-panel">
      <div className="task-history-list" data-testid="task-history-list">
        {props.tasks.map((task) => (
          <button
            key={task.taskId}
            type="button"
            className={
              task.taskId === props.selectedTaskId
                ? 'task-history-row selected'
                : 'task-history-row'
            }
            onClick={() => props.onSelectTask(task.taskId)}
          >
            <div className="task-history-row-top">
              <strong>{props.formatTaskTitle(task.cwd)}</strong>
              <span>{props.formatTaskUpdatedAt(task.updatedAt)}</span>
            </div>
            <div className="task-history-row-meta">
              <span>{props.formatTaskStatus(task)}</span>
              <span>{`${task.completedRounds}/${task.targetRounds}`}</span>
              <span>{`${Math.round(task.perRoundTimeoutMs / 60_000)}m`}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="task-history-rounds" data-testid="task-history-rounds">
        {props.rounds.length === 0 ? (
          <p className="history-empty">{props.noRoundsText}</p>
        ) : (
          props.rounds.map((round) => (
            <article
              key={`${round.taskId}-${round.roundNumber}`}
              className="history-round-card"
            >
              <div className="history-round-top">
                <h3>{formatRoundHeading(round.roundNumber, props.locale)}</h3>
                <span>{`${round.durationMs}ms`}</span>
              </div>
              <p className="history-round-meta">{round.resultType}</p>
              <p className="history-round-meta">{`exit ${round.exitCode}`}</p>
              <p className="history-round-message">{round.lastMessage}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
