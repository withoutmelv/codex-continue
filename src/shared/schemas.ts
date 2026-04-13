import { z } from 'zod';

export const sessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  cwd: z.string(),
  rolloutPath: z.string(),
  updatedAt: z.number(),
});

export const listSessionsResponseSchema = z.object({
  sessions: z.array(sessionSummarySchema),
});

export const startTaskResponseSchema = z.object({
  taskId: z.string(),
});

export const managedTaskSchema = z.object({
  taskId: z.string(),
  sessionId: z.string(),
  cwd: z.string(),
  fixedPrompt: z.string(),
  targetRounds: z.number().int().positive(),
  completedRounds: z.number().int().nonnegative(),
  perRoundTimeoutMs: z.number().int().positive(),
  terminalBinding: z.string().nullable(),
  status: z.enum([
    'Idle',
    'Ready',
    'LaunchingTerminal',
    'RunningRound',
    'RoundFinished',
    'Completed',
    'Stopped',
    'Failed',
  ]),
  lastExitCode: z.number().nullable(),
  lastStatusText: z.string().nullable(),
  startedAt: z.number(),
  updatedAt: z.number(),
});

export const managedTaskRoundSchema = z.object({
  taskId: z.string(),
  roundNumber: z.number().int().positive(),
  exitCode: z.number(),
  resultType: z.string(),
  lastMessage: z.string(),
  durationMs: z.number().int().nonnegative(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
});

export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type ListSessionsResponse = z.infer<typeof listSessionsResponseSchema>;
export type StartTaskResponse = z.infer<typeof startTaskResponseSchema>;
export type ManagedTask = z.infer<typeof managedTaskSchema>;
export type ManagedTaskRound = z.infer<typeof managedTaskRoundSchema>;
