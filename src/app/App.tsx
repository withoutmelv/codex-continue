import { useEffect, useState } from 'react';
import { TaskConfigForm } from '../features/tasks/TaskConfigForm';
import { TaskStatusPanel } from '../features/tasks/TaskStatusPanel';
import { SessionList } from '../features/sessions/SessionList';
import {
  listSessions,
  listTasks,
  startTask,
  stopTask,
} from '../lib/electronApi';
import { type SessionSummary } from '../shared/schemas';

type Locale = 'en' | 'zh';

const copyByLocale = {
  en: {
    title: 'Codex Continue Desktop',
    subtitle:
      'Select an existing Codex session, configure the takeover prompt, and keep execution visible in one native terminal window.',
    sessionLibrary: 'Session Library',
    sessionEmpty: 'No sessions found.',
    managedTaskControl: 'Managed Task Control',
    fixedPrompt: 'Fixed Prompt',
    sendCount: 'Send Count',
    perRoundTimeout: 'Per-Round Timeout',
    autoHost: 'Auto Host',
    refreshSessions: 'Refresh Sessions',
    taskStatus: 'Task Status',
    nativeTerminalWindow: 'Native Terminal Window',
    stop: 'Stop',
    idleTerminal: '$ idle',
    taskRunning: (taskId: string) => `$ task ${taskId} running in native terminal`,
    taskStates: {
      Idle: 'Idle',
      LaunchingTerminal: 'LaunchingTerminal',
      Stopped: 'Stopped',
    },
  },
  zh: {
    title: 'Codex Continue 桌面端',
    subtitle:
      '选择一个已有的 Codex 会话，配置自动托管指令，并在同一个系统终端窗口里持续查看执行输出。',
    sessionLibrary: '会话列表',
    sessionEmpty: '当前没有可用会话。',
    managedTaskControl: '自动托管设置',
    fixedPrompt: '固定指令',
    sendCount: '发送次数',
    perRoundTimeout: '单轮超时',
    autoHost: '自动托管',
    refreshSessions: '刷新会话',
    taskStatus: '任务状态',
    nativeTerminalWindow: '原生终端窗口',
    stop: '停止',
    idleTerminal: '$ 空闲中',
    taskRunning: (taskId: string) => `$ 任务 ${taskId} 正在原生终端中运行`,
    taskStates: {
      Idle: '空闲',
      LaunchingTerminal: '正在启动终端',
      Stopped: '已停止',
    },
  },
} as const;

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskState, setTaskState] = useState('Idle');
  const [locale, setLocale] = useState<Locale>('en');
  const [fixedPrompt, setFixedPrompt] = useState(
    'Continue the current task. End with STATUS: DONE, NEEDS_INPUT, BLOCKED, or RETRY.',
  );
  const [sendCount, setSendCount] = useState(8);
  const [timeoutMinutes, setTimeoutMinutes] = useState(15);
  const copy = copyByLocale[locale];

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null;

  async function refreshSessions() {
    const response = await listSessions();
    setSessions(response.sessions);
    setSelectedSessionId((current) => current ?? response.sessions[0]?.id ?? null);
  }

  useEffect(() => {
    void refreshSessions();
    void listTasks();
  }, []);

  async function handleStart() {
    if (!selectedSession) {
      return;
    }

    setTaskState('LaunchingTerminal');

    const createdTask = await startTask({
      sessionId: selectedSession.id,
      cwd: selectedSession.cwd,
      fixedPrompt,
      targetRounds: sendCount,
      perRoundTimeoutMs: timeoutMinutes * 60_000,
    });

    setActiveTaskId(createdTask.taskId);
  }

  async function handleStop() {
    if (!activeTaskId) {
      return;
    }

    await stopTask(activeTaskId);
    setTaskState('Stopped');
  }

  return (
    <main className="app-shell azure-layout">
      <section className="hero-panel compact-hero">
        <div className="hero-copy-block">
          <h1>{copy.title}</h1>
          <p className="hero-copy">{copy.subtitle}</p>
        </div>
        <div className="locale-switch" role="group" aria-label="Language Switch">
          <button
            type="button"
            className={locale === 'en' ? 'locale-button active' : 'locale-button'}
            aria-pressed={locale === 'en'}
            onClick={() => setLocale('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={locale === 'zh' ? 'locale-button active' : 'locale-button'}
            aria-pressed={locale === 'zh'}
            onClick={() => setLocale('zh')}
          >
            中文
          </button>
        </div>
      </section>

      <section className="content-grid">
        <SessionList
          heading={copy.sessionLibrary}
          emptyText={copy.sessionEmpty}
          locale={locale}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={setSelectedSessionId}
        />
        <div className="main-stack" data-testid="task-workspace">
          <TaskConfigForm
            copy={copy}
            fixedPrompt={fixedPrompt}
            onFixedPromptChange={setFixedPrompt}
            sendCount={sendCount}
            onSendCountChange={setSendCount}
            timeoutMinutes={timeoutMinutes}
            onTimeoutMinutesChange={setTimeoutMinutes}
            onStart={handleStart}
            onRefreshSessions={refreshSessions}
          />
          <TaskStatusPanel
            copy={copy}
            stateLabel={copy.taskStates[taskState as keyof typeof copy.taskStates] ?? taskState}
            activeTaskId={activeTaskId}
            onStop={handleStop}
          />
        </div>
      </section>
    </main>
  );
}
