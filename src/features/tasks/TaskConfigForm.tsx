type TaskConfigFormProps = {
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
    <section className="surface-card">
      <h2>Managed Task Control</h2>
      <label className="field">
        <span>Fixed Prompt</span>
        <textarea
          value={props.fixedPrompt}
          onChange={(event) => props.onFixedPromptChange(event.target.value)}
        />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Send Count</span>
          <input
            aria-label="Send Count"
            value={props.sendCount}
            onChange={(event) => props.onSendCountChange(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Per-Round Timeout</span>
          <input
            aria-label="Per-Round Timeout"
            value={props.timeoutMinutes}
            onChange={(event) =>
              props.onTimeoutMinutesChange(Number(event.target.value))
            }
          />
        </label>
      </div>
      <div className="button-row">
        <button className="primary-button" onClick={props.onStart}>
          Auto Host
        </button>
        <button className="secondary-button" onClick={props.onRefreshSessions}>
          Refresh Sessions
        </button>
      </div>
    </section>
  );
}
