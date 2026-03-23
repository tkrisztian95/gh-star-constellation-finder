import { graphql } from '@octokit/graphql';

export interface AuthResult {
  login: string;
  token: string;
  graphqlWithAuth: typeof graphql;
}

export async function authenticate(): Promise<AuthResult> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('Error: GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  // Check scopes and validate token via a raw fetch first
  let login: string;
  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `token ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: '{ viewer { login } }' }),
    });

    if (response.status === 401) {
      console.error('Error: GitHub token is invalid or expired');
      process.exit(1);
    }

    const scopes = response.headers.get('x-oauth-scopes') ?? '';
    const scopeList = scopes.split(',').map((s) => s.trim()).filter(Boolean);
    const hasWriteScope = scopeList.some((s) =>
      s === 'repo' || s === 'public_repo' || s === 'user'
    );

    if (!hasWriteScope) {
      console.warn(
        'Warning: token may lack write permissions for GitHub Lists — accept actions will fail'
      );
    }

    const body = await response.json() as { data?: { viewer?: { login?: string } }; errors?: unknown[] };
    if (body.errors || !body.data?.viewer?.login) {
      console.error('Error: GitHub token is invalid or expired');
      process.exit(1);
    }
    login = body.data.viewer.login;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('401') ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('bad credentials')
    ) {
      console.error('Error: GitHub token is invalid or expired');
    } else {
      console.error(`Error: GitHub authentication failed — ${message}`);
    }
    process.exit(1);
  }

  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  return { login, token, graphqlWithAuth };
}
