import assert from 'assert';
import sinon from 'sinon';
import * as fs from 'fs';
import { Anthropic } from '@anthropic-ai/sdk';
import { fetchIssues, GitHubIssue } from '../fetch.js';
import { enrichIssue } from '../enrich.js';
import { writeOutput } from '../write.js';

const mockIssue: GitHubIssue = {
  number: 1,
  title: 'Test issue',
  body: 'Test body',
  labels: [{ name: 'bug' }],
  created_at: '2026-01-01T00:00:00Z',
  comments: 2,
};

const mockEnrichedIssue = {
  number: 1,
  title: 'Test issue',
  body: 'Test body',
  labels: ['bug'],
  created_at: '2026-01-01T00:00:00Z',
  comments: 2,
  severity: 'High' as const,
  summary: 'A test issue.',
  next_action: 'Needs reproduction steps',
};

describe('fetch.ts', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('Test 1: returns an array of issues on a successful response', async () => {
    fetchStub.resolves({
      ok: true,
      json: async () => [mockIssue],
    } as unknown as Response);

    const issues = await fetchIssues(1);
    assert.strictEqual(issues.length, 1);
    assert.strictEqual(issues[0].number, 1);
  });

  it('Test 2: throws when the GitHub API returns a non-OK status', async () => {
    fetchStub.resolves({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as unknown as Response);

    await assert.rejects(
      () => fetchIssues(1),
      /GitHub API error: 403 Forbidden/
    );
  });

  it('Test 3: passes the limit parameter to the API call', async () => {
    fetchStub.resolves({
      ok: true,
      json: async () => [],
    } as unknown as Response);

    await fetchIssues(7);
    const calledUrl = fetchStub.firstCall.args[0] as string;
    assert.ok(calledUrl.includes('per_page=7'));
  });
});

describe('enrich.ts', () => {
  it('Test 4: returns an enriched issue when Claude returns valid JSON', async () => {
    const fakeClient = {
      messages: {
        create: sinon.stub().resolves({
          content: [{
            type: 'text', text: JSON.stringify({
              severity: 'High',
              summary: 'A test issue.',
              next_action: 'Needs reproduction steps',
            })
          }],
        }),
      },
    } as unknown as Anthropic;

    const result = await enrichIssue(mockIssue, fakeClient);
    assert.strictEqual(result.severity, 'High');
    assert.strictEqual(result.summary, 'A test issue.');
  });

  it('Test 5: strips markdown code fences before parsing', async () => {
    const fakeClient = {
      messages: {
        create: sinon.stub().resolves({
          content: [{ type: 'text', text: '```json\n{"severity":"Medium","summary":"A test.","next_action":"Close it"}\n```' }],
        }),
      },
    } as unknown as Anthropic;

    const result = await enrichIssue(mockIssue, fakeClient);
    assert.strictEqual(result.severity, 'Medium');
  });

  it('Test 6: throws when Zod validation fails', async () => {
    const fakeClient = {
      messages: {
        create: sinon.stub().resolves({
          content: [{
            type: 'text', text: JSON.stringify({
              severity: 'moderate',
              summary: 'A test.',
              next_action: 'Close it',
            })
          }],
        }),
      },
    } as unknown as Anthropic;

    await assert.rejects(
      () => enrichIssue(mockIssue, fakeClient),
      /Zod validation failed/
    );
  });
});

describe('write.ts', () => {
  let mkdirStub: sinon.SinonStub;
  let writeFileStub: sinon.SinonStub;

  beforeEach(() => {
    mkdirStub = sinon.stub(fs.promises, 'mkdir').resolves(undefined);
    writeFileStub = sinon.stub(fs.promises, 'writeFile').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('Test 7: creates the output directory if it does not exist', async () => {
    await writeOutput([mockEnrichedIssue]);
    assert.ok(mkdirStub.calledOnce);
  });

  it('Test 8: writes a JSON file to the correct path', async () => {
    await writeOutput([mockEnrichedIssue]);
    assert.ok(writeFileStub.calledOnce);
    const filePath = writeFileStub.firstCall.args[0] as string;
    assert.ok(filePath.includes('enriched-issues.json'));
  });

  it('Test 9: output includes generated_at and issue_count', async () => {
    await writeOutput([mockEnrichedIssue]);
    const written = writeFileStub.firstCall.args[1] as string;
    const parsed = JSON.parse(written);
    assert.ok(parsed.generated_at);
    assert.strictEqual(parsed.issue_count, 1);
  });
});