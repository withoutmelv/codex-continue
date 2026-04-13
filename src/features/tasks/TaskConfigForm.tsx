type TaskConfigFormProps = {
  copy: {
    managedTaskControl: string;
    fixedPrompt: string;
    sendCount: string;
    perRoundTimeout: string;
    autoHost: string;
    refreshSessions: string;
  };
  fixedPrompt: string;
  onFixedPromptChange: (value: string) => void;
  sendCount: number;
  onSendCountChange: (value: number) => void;
  timeoutMinutes: number;
  onTimeoutMinutesChange: (value: number) => void;
  onStart: () => void;
  onRefreshSessions: () => void;
};

export function TaskConfigForm(props: TaskConfigFormProps) {
  return (
    <section className="surface-card task-control-panel">
      <h2>{props.copy.managedTaskControl}</h2>
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
      <div className="button-row">
        <button className="primary-button" onClick={props.onStart}>
          {props.copy.autoHost}
        </button>
        <button className="secondary-button" onClick={props.onRefreshSessions}>
          {props.copy.refreshSessions}
        </button>
      </div>
    </section>
  );
}
