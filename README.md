# github-issue-triage

An automated pipeline that fetches open GitHub issues, uses Claude to classify severity, summarize the problem, and suggest a next action, then writes the enriched results to a structured JSON file.

This project simulates the kind of AI-powered data enrichment workflow used in enterprise integration platforms like Workato, Boomi, and MuleSoft — built from scratch in TypeScript to demonstrate the underlying architecture.

---

## How It Works

The pipeline follows the ETL pattern (Extract, Transform, Load), broken into four discrete stages:

```
index.ts → fetch.ts → enrich.ts (+ validate.ts) → write.ts
```

**`index.ts`** — The entry point and conductor. Calls each stage in sequence and logs progress. Does no data work itself.

**`fetch.ts`** — The Extract stage. Calls the GitHub REST API and returns an array of raw open issues. No auth required for public repos.

**`enrich.ts`** — The Transform stage. Takes each raw issue, sends it to Claude with a structured prompt, and returns an enriched issue with three AI-generated fields: `severity`, `summary`, and `next_action`. Imports `validate.ts` to run schema validation on Claude's response before returning.

**`validate.ts`** — The data contract. Defines a Zod schema that validates Claude's output at runtime. If Claude returns a malformed response, the pipeline fails here with a clear error rather than writing bad data to disk.

**`write.ts`** — The Load stage. Takes the completed array of enriched issues and writes them to `output/enriched-issues.json` with a timestamp and issue count at the top level.

Each file owns exactly one stage of the pipeline. This mirrors how enterprise integration platforms structure their workflows — discrete, single-responsibility steps that are easy to test, debug, and replace independently.

---

## Sample Output

Each run produces `output/enriched-issues.json`. The pipeline fetches real open issues from `microsoft/vscode` and enriches each one with three Claude-generated fields.

The second record below demonstrates the pipeline handling noisy, real-world data — the original issue body contained hundreds of lines of system diagnostics and A/B experiment IDs. Claude extracted a clean one-sentence summary regardless.

```json
{
  "generated_at": "2026-03-12T00:44:38.000Z",
  "issue_count": 5,
  "issues": [
    {
      "number": 300963,
      "title": "Revert \"updates component explorer\"",
      "body": "Reverts microsoft/vscode#300914\r\n\r\nGotta wait on Terrapin... :(",
      "labels": [],
      "created_at": "2026-03-12T00:44:38Z",
      "comments": 0,
      "severity": "Medium",
      "summary": "A previous update to the component explorer needs to be reverted due to a dependency on Terrapin that is not yet ready.",
      "next_action": "Needs more info"
    },
    {
      "number": 300960,
      "title": "Looping",
      "body": "Type: Bug — the answer started looping...",
      "labels": ["info-needed", "triage-needed"],
      "created_at": "2026-03-12T00:39:36Z",
      "comments": 2,
      "severity": "High",
      "summary": "The extension causes an infinite loop when generating answers in VS Code version 0.35.3.",
      "next_action": "Needs reproduction steps"
    }
  ]
}
```

---

## Tech Stack

- **TypeScript** — end to end
- **GitHub REST API** — issue fetching, no auth required for public repos
- **Anthropic SDK** (`@anthropic-ai/sdk`) — Claude API integration
- **Claude Haiku 4.5** — Anthropic's fastest, most cost-efficient model. Matches Sonnet 4 performance at ~1/3 the cost — sufficient for structured JSON extraction tasks like issue triage
- **Zod** — runtime schema validation on Claude's output
- **dotenv** — API key management
- **Mocha + Sinon** — unit test suite

---

## Setup

**1. Clone the repo and install dependencies**

```bash
git clone https://github.com/kaidez/github-issue-triage.git
cd github-issue-triage
npm install
```

**2. Add your Anthropic API key**

Copy `.env.example` to `.env` and add your key:

```bash
cp .env.example .env
```

```
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

**3. Build**

```bash
npm run build
```

**4. Run**

```bash
node dist/index.js
```

---

## Project Structure

```
github-issue-triage/
├── src/
│   ├── index.ts        # entry point — orchestrates the pipeline
│   ├── fetch.ts        # Extract — GitHub API call
│   ├── enrich.ts       # Transform — Claude prompt and response parsing
│   ├── validate.ts     # data contract — Zod schema
│   ├── write.ts        # Load — JSON file output
│   └── test/
│       └── index.test.ts  # unit test suite (9 tests)
├── output/
│   └── .gitkeep        # pipeline writes enriched-issues.json here at runtime
├── .env.example
├── TODO.md
└── package.json
```

---

## Configuration

By default the pipeline fetches 5 open issues from `microsoft/vscode`. To change the issue count, update `src/index.ts`:

```typescript
const issues = await fetchIssues(10); // change limit here
```

To point at a different repo, update the `GITHUB_API_URL` constant in `src/fetch.ts`.

---

## Running Tests

```bash
npm test
```

The test suite uses dependency injection to stub the Anthropic client — no real API calls are made during testing. All 9 tests run in under a second.

---

## Key Patterns Demonstrated

**ETL pipeline** — discrete Extract, Transform, Load stages with single-responsibility files, mirroring the structure of enterprise integration platform workflows.

**AI enrichment** — Claude sits in the Transform stage, adding structured intelligence (severity classification, plain-English summary, suggested next action) to raw API data.

**Write-on-success** — the pipeline only writes output after all issues are successfully fetched, enriched, and validated. No partial writes.

**Runtime schema validation** — Zod validates Claude's JSON response before it enters the rest of the pipeline. The schema acts as a data contract between the AI layer and the persistence layer.

**Dependency injection** — the Anthropic client is injected into `enrichIssue()` as an optional parameter, defaulting to the real client in production and accepting a stub in tests. This eliminates module-level mocking and sidesteps ESM/CommonJS interop issues entirely.

**Prompt engineering for structured output** — system prompt and user prompt are separated. The system prompt sets Claude's role and output format once. The user prompt carries issue data. Markdown code fence stripping handles cases where the model wraps JSON in backticks despite being instructed not to.