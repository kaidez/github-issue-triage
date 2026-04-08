import { promises as fs } from 'fs';
import path from 'path';
import { EnrichedIssue } from './validate.js';

const OUTPUT_DIR = 'output';
const OUTPUT_FILE = 'enriched-issues.json';

interface PipelineOutput {
  generated_at: string;
  issue_count: number;
  issues: EnrichedIssue[];
}

export async function writeOutput(issues: EnrichedIssue[]): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    fs.rm(path.join(OUTPUT_DIR, OUTPUT_FILE), { force: true }),
    fs.rm(path.join(OUTPUT_DIR, 'report.md'), { force: true }),
  ]);

  const output: PipelineOutput = {
    generated_at: new Date().toISOString(),
    issue_count: issues.length,
    issues: issues
  };

  const filePath = path.join(OUTPUT_DIR, OUTPUT_FILE);
  await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`✓ Wrote ${issues.length} enriched issue(s) to ${filePath}`);
}

export async function writeToFile(issues: EnrichedIssue[]): Promise<void> {

  const json = JSON.parse(await fs.readFile('output/enriched-issues.json', 'utf8'));
  const report = path.join(OUTPUT_DIR, 'report.md');

  const lines = [
    `# GitHub Issue Triage`,
    `Generated: ${json.generated_at}`,
    `Issues: ${json.issue_count}`,
    '',
  ];

  for (const issue of json.issues) {
    lines.push(`## [#${issue.number}] ${issue.title}`);
    lines.push(`**Severity:** ${issue.severity} | **Comments:** ${issue.comments}`);
    lines.push('');
    lines.push(`**Summary:** ${issue.summary}`);
    lines.push(`**Next action:** ${issue.next_action}`);
    lines.push('');
  }

  await fs.writeFile(report, lines.join('\n'), 'utf8');
  console.log(`✓ Wrote report to ${report}`);

}