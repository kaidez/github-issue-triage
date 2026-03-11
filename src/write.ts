import { promises as fs } from 'fs';
import path from 'path';
import { EnrichedIssue } from './validate.js';

const OUTPUT_DIR = 'output';
const OUTPUT_FILE = 'enriched-issues.json';

export interface PipelineOutput {
  generated_at: string;
  issue_count: number;
  issues: EnrichedIssue[];
}

export async function writeOutput(issues: EnrichedIssue[]): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const output: PipelineOutput = {
    generated_at: new Date().toISOString(),
    issue_count: issues.length,
    outputs: issues,
  };

  const filePath = path.join(OUTPUT_DIR, OUTPUT_FILE);
  await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`✓ Wrote ${issues.length} enriched issue(s) to ${filePath}`);
}