import Anthropic from '@anthropic-ai/sdk';
import { EnrichedIssueSchema, EnrichedIssue } from './validate.js';
import { GitHubIssue } from './fetch.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an engineering triage assistant. Analyze GitHub issues and return structured JSON only. No explanation, no markdown, no code fences. Return only valid JSON.`;

function buildUserPrompt(issue: GitHubIssue): string {
  const labels = issue.labels.map(l => l.name).join(', ') || 'none';
  const body = issue.body?.trim() || 'No description provided.';

  return `Analyze this GitHub issue and return a JSON object with exactly these three fields:
- "severity": one of "Critical", "High", "Medium", or "Low"
- "summary": one sentence describing the problem in plain English
- "next_action": a short suggested action (e.g. "Needs reproduction steps", "Ready to assign", "Duplicate — close", "Needs more info")

Issue #${issue.number}
Title: ${issue.title}
Labels: ${labels}
Comments: ${issue.comments}
Body: ${body}

Return only the JSON object. No other text.`;
}

export async function enrichIssue(issue: GitHubIssue): Promise<EnrichedIssue> {

  // Haiku is Anthropic's fastest, most cost-efficient model.
  // It matches Sonnet 4 performance at ~1/3 the cost — sufficient for
  // structured JSON extraction tasks like issue triage.
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(issue) }],
  });

  const raw = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Claude returned non-JSON for issue #${issue.number}: ${raw}`);
  }

  const result = EnrichedIssueSchema.safeParse({
    number: issue.number,
    title: issue.title,
    body: issue.body,
    labels: issue.labels.map(l => l.name),
    created_at: issue.created_at,
    comments: issue.comments,
    ...(parsed as object),
  });

  if (!result.success) {
    throw new Error(`Zod validation failed for issue #${issue.number}: ${result.error.message}`);
  }

  return result.data;
}