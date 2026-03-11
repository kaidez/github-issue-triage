import dotenv from 'dotenv';
dotenv.config();

const GITHUB_API_URL = 'https://api.github.com/repos/microsoft/vscode/issues';

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: { name: string }[];
  created_at: string;
  comments: number;
}

export async function fetchIssues(limit = 10): Promise<GitHubIssue[]> {
  const response = await fetch(`${GITHUB_API_URL}?state=open&per_page=${limit}`);

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const issues = await response.json() as GitHubIssue[];
  return issues;
}