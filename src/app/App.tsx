import { useEffect, useState } from 'react';
import { SessionList } from '../features/sessions/SessionList';
import { SessionTranscriptPanel } from '../features/sessions/SessionTranscriptPanel';
import { formatSessionTimestamp } from '../features/sessions/formatSessionTimestamp';
import { TaskConfigForm } from '../features/tasks/TaskConfigForm';
import {
  getSessionTranscript,
  listSessions,
  listTasks,
  startTask,
  stopTask,
} from '../lib/electronApi';
import {
  type ManagedTask,
  type SessionSummary,
  type SessionTranscriptEntry,
} from '../shared/schemas';

type Locale = 'en' | 'zh';

const copyByLocale = {
  en: {
    title: 'Codex Continue Desktop',
    subtitle:
      'Choose a Codex session from the sidebar and manage the hosted workflow from one focused control panel.',
    sessionLibrary: 'Session Library',
    sessionEmpty: 'No sessions found.',
    refreshSessions: 'Refresh Sessions',
    sortHint: 'Sorted by most recent activity',
    searchLabel: 'Search projects',
    searchPlaceholder: 'Search project name',
    managedTaskControl: 'Managed Task Control',
    transcriptHeading: 'Conversation History',
    transcriptEmpty: 'No transcript available for this session.',
    fixedPrompt: 'Fixed Prompt',
    sendCount: 'Send Count',
    perRoundTimeout: 'Per-Round Timeout',
    currentStatus: 'Current Status',
    currentStatusDetail: 'Status Detail',
    updatedAtLabel: 'Updated',
    projectPathLabel: 'Project Path',
    manualResumeLabel: 'Manual Resume',
    autoHost: 'Auto Host',
    stop: 'Stop',
    taskStates: {
      Idle: 'Idle',
      Ready: 'Ready',
      LaunchingTerminal: 'LaunchingTerminal',
      RunningRound: 'RunningRound',
      RoundFinished: 'RoundFinished',
      Completed: 'Completed',
      Stopped: 'Stopped',
      Failed: 'Failed',
    },
    taskStatusDetails: {
      timed_out: 'Round Timed Out',
      process_error: 'Process Error',
      runtime_error: 'Runtime Error',
    },
  },
  zh: {
    title: 'Codex Continue 桌面端',
    subtitle:
      '在侧边栏选择会话，在右侧主控面板里完成自动托管设置和状态控制。',
    sessionLibrary: '会话列表',
    sessionEmpty: '当前没有可用会话。',
    refreshSessions: '刷新会话',
    sortHint: '按最近更新时间排序',
    searchLabel: '搜索项目',
    searchPlaceholder: '搜索项目名',
    managedTaskControl: '自动托管设置',
    transcriptHeading: '对话记录',
    transcriptEmpty: '当前会话没有可展示的记录。',
    fixedPrompt: '固定指令',
    sendCount: '发送次数',
    perRoundTimeout: '单轮超时',
    currentStatus: '当前状态',
    currentStatusDetail: '状态详情',
    updatedAtLabel: '更新时间',
    projectPathLabel: '项目路径',
    manualResumeLabel: '人工接管命令',
    autoHost: '自动托管',
    stop: '停止',
    taskStates: {
      Idle: '空闲',
      Ready: '就绪',
      LaunchingTerminal: '正在启动终端',
      RunningRound: '正在执行单轮',
      RoundFinished: '单轮完成',
      Completed: '已完成',
      Stopped: '已停止',
      Failed: '失败',
    },
    taskStatusDetails: {
      timed_out: '单轮超时',
      process_error: '进程异常',
      runtime_error: '运行时异常',
    },
  },
} as const;

const terminalTaskStates = new Set(['Completed', 'Stopped', 'Failed']);

function getStatusDetailText(
  task: ManagedTask | null,
  copy: (typeof copyByLocale)[Locale],
) {
  if (!task || task.status !== 'Failed' || !task.lastStatusText) {
    return '';
  }

  return (
    copy.taskStatusDetails[
      task.lastStatusText as keyof typeof copy.taskStatusDetails
    ] ?? task.lastStatusText
  );
}

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskState, setTaskState] = useState('Idle');
  const [taskStatusDetail, setTaskStatusDetail] = useState('');
  const [locale, setLocale] = useState<Locale>('zh');
  const [transcriptEntries, setTranscriptEntries] = useState<SessionTranscriptEntry[]>([]);
  const [fixedPrompt, setFixedPrompt] = useState('我要出去了，按照你的建议继续做');
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
  }, []);

  useEffect(() => {
    if (!selectedSession?.rolloutPath) {
      setTranscriptEntries([]);
      return;
    }

    void getSessionTranscript(selectedSession.rolloutPath).then((response) => {
      setTranscriptEntries(response.entries);
    });
  }, [selectedSession?.rolloutPath]);

  useEffect(() => {
    if (!activeTaskId) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const syncTask = async () => {
      const tasks = await listTasks();
      if (cancelled) {
        return;
      }

      const currentTask = tasks.find((task) => task.taskId === activeTaskId);
      if (!currentTask) {
        return;
      }

      setTaskState(currentTask.status);
      setTaskStatusDetail(getStatusDetailText(currentTask, copy));

      if (terminalTaskStates.has(currentTask.status)) {
        if (intervalId) {
          clearInterval(intervalId);
        }
        setActiveTaskId(null);
      }
    };

    void syncTask();
    intervalId = setInterval(() => {
      void syncTask();
    }, 1000);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeTaskId, copy]);

  async function handleStart() {
    if (!selectedSession) {
      return;
    }

    setTaskState('LaunchingTerminal');
    setTaskStatusDetail('');

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
    setTaskStatusDetail('');
  }

  return (
    <main className="app-shell azure-layout" data-testid="app-shell">
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

      <section className="content-grid" data-testid="content-grid">
        <SessionList
          heading={copy.sessionLibrary}
          emptyText={copy.sessionEmpty}
          refreshLabel={copy.refreshSessions}
          sortHint={copy.sortHint}
          searchLabel={copy.searchLabel}
          searchPlaceholder={copy.searchPlaceholder}
          locale={locale}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={setSelectedSessionId}
          onRefresh={refreshSessions}
        />
        <div className="main-stack" data-testid="task-workspace">
          <TaskConfigForm
            copy={copy}
            stateLabel={
              copy.taskStates[taskState as keyof typeof copy.taskStates] ?? taskState
            }
            stateDetailText={taskStatusDetail}
            canStop={Boolean(activeTaskId)}
            updatedAtText={
              selectedSession ? formatSessionTimestamp(selectedSession.updatedAt) : ''
            }
            projectPath={selectedSession?.cwd ?? ''}
            resumeCommand={
              selectedSession ? `codex resume ${selectedSession.id}` : 'codex resume'
            }
            fixedPrompt={fixedPrompt}
            onFixedPromptChange={setFixedPrompt}
            sendCount={sendCount}
            onSendCountChange={setSendCount}
            timeoutMinutes={timeoutMinutes}
            onTimeoutMinutesChange={setTimeoutMinutes}
            onStart={handleStart}
            onStop={handleStop}
          />
          <SessionTranscriptPanel
            heading={copy.transcriptHeading}
            emptyText={copy.transcriptEmpty}
            entries={transcriptEntries}
          />
        </div>
      </section>
    </main>
  );
}
