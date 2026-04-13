type TaskConfigFormProps = {
  copy: {
    managedTaskControl: string;
    fixedPrompt: string;
    sendCount: string;
    perRoundTimeout: string;
    currentStatus: string;
    updatedAtLabel: string;
    projectPathLabel: string;
    manualResumeLabel: string;
    autoHost: string;
    stop: string;
  };
  stateLabel: string;
  canStop: boolean;
  updatedAtText: string;
  projectPath: string;
  resumeCommand: string;
  fixedPrompt: string;
  onFixedPromptChange: (value: string) => void;
  sendCount: number;
  onSendCountChange: (value: number) => void;
  timeoutMinutes: number;
  onTimeoutMinutesChange: (value: number) => void;
  onStart: () => void;
  onStop: () => void;
};

export function TaskConfigForm(props: TaskConfigFormProps) {
  return (
    <section className="surface-card task-control-panel">
      <div className="task-panel-header">
        <div>
          <h2>{props.copy.managedTaskControl}</h2>
          <div className="task-status-inline">
            <span className="status-label">{props.copy.currentStatus}</span>
            <strong className="status-value">{props.stateLabel}</strong>
          </div>
        </div>
        <div className="task-panel-actions">
          <button className="primary-button" onClick={props.onStart}>
            {props.copy.autoHost}
          </button>
          <button
            className="danger-button"
            disabled={!props.canStop}
            onClick={props.onStop}
          >
            {props.copy.stop}
          </button>
        </div>
      </div>

      <div className="task-subtitle">
        <p>
          <span className="task-subtitle-label">{props.copy.updatedAtLabel}</span>
          <span>{props.updatedAtText}</span>
        </p>
        <p>
          <span className="task-subtitle-label">{props.copy.projectPathLabel}</span>
          <span>{props.projectPath}</span>
        </p>
      </div>

      <label className="field">
        <span>{props.copy.fixedPrompt}</span>
        <textarea
          value={props.fixedPrompt}
          onChange={(event) => props.onFixedPromptChange(event.target.value)}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>{props.copy.sendCount}</span>
          <input
            aria-label={props.copy.sendCount}
            value={props.sendCount}
            onChange={(event) => props.onSendCountChange(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>{props.copy.perRoundTimeout}</span>
          <input
            aria-label={props.copy.perRoundTimeout}
            value={props.timeoutMinutes}
            onChange={(event) =>
              props.onTimeoutMinutesChange(Number(event.target.value))
            }
          />
        </label>
      </div>

      <div className="manual-resume">
        <span className="task-subtitle-label">{props.copy.manualResumeLabel}</span>
        <code>{props.resumeCommand}</code>
      </div>
    </section>
  );
}
