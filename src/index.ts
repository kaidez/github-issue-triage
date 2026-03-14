import 'dotenv/config';
import { fetchIssues } from './fetch.js';
import { enrichIssue } from './enrich.js';

import { writeOutput } from './write.js';

// Import the TypeScript type inferred from the Zod schema — used to type the enriched issues array.
import { EnrichedIssue } from './validate.js';

async function run(): Promise<void> {
  console.log('Starting GitHub issue triage pipeline...');

  console.log('Step 1/3: Fetching issues from GitHub...');
  const issues = await fetchIssues(5);
  console.log(`✓ Fetched ${issues.length} issue(s)`);

  console.log('Step 2/3: Enriching issues with Claude...');
  const enriched: EnrichedIssue[] = [];

  for (const issue of issues) {
    console.log(`  → Enriching issue #${issue.number}: ${issue.title}`);
    const result = await enrichIssue(issue);
    enriched.push(result);
  }
  console.log(`✓ Enriched ${enriched.length} issue(s)`);

  console.log('Step 3/3: Writing output...');
  await writeOutput(enriched);

  console.log('\nPipeline complete.');
}

run().catch((error) => {
  console.error('Pipeline failed:', error);
  process.exit(1);
});