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

export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type ListSessionsResponse = z.infer<typeof listSessionsResponseSchema>;
