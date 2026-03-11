import { z } from 'zod';

export const EnrichedIssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  labels: z.array(z.string()),
  created_at: z.string(),
  comments: z.number(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  summary: z.string(),
  next_action: z.string(),
});

export type EnrichedIssue = z.infer<typeof EnrichedIssueSchema>;