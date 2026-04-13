export function TaskConfigForm() {
  return (
    <section className="surface-card">
      <h2>Managed Task Control</h2>
      <label className="field">
        <span>Fixed Prompt</span>
        <textarea defaultValue="Continue the current task. End with STATUS: DONE, NEEDS_INPUT, BLOCKED, or RETRY." />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Send Count</span>
          <input defaultValue="8" />
        </label>
        <label className="field">
          <span>Per-Round Timeout</span>
          <input defaultValue="15" />
        </label>
      </div>
      <div className="button-row">
        <button className="primary-button">Auto Host</button>
        <button className="secondary-button">Stop</button>
        <button className="secondary-button">Refresh Sessions</button>
      </div>
    </section>
  );
}
