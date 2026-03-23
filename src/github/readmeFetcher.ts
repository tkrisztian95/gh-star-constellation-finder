const README_MAX_LENGTH = 4000;

async function fetchReadme(
  owner: string,
  repo: string,
  token: string
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        authorization: `token ${token}`,
        accept: 'application/vnd.github.v3+json',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`README fetch error for ${owner}/${repo}: ${message}`);
    return '';
  }

  if (response.status === 404) {
    return '';
  }

  if (!response.ok) {
    console.error(
      `README fetch error for ${owner}/${repo}: HTTP ${response.status}`
    );
    return '';
  }

  const body = await response.json() as { content?: string; encoding?: string };

  if (!body.content || body.encoding !== 'base64') {
    return '';
  }

  const decoded = Buffer.from(body.content.replace(/\n/g, ''), 'base64').toString('utf-8');

  if (decoded.length > README_MAX_LENGTH) {
    return decoded.slice(0, README_MAX_LENGTH) + '... [truncated]';
  }

  return decoded;
}

function createSemaphore(concurrency: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  function next() {
    if (queue.length > 0 && running < concurrency) {
      running++;
      const resolve = queue.shift()!;
      resolve();
    }
  }

  return async function acquire(): Promise<() => void> {
    if (running < concurrency) {
      running++;
      return () => {
        running--;
        next();
      };
    }
    await new Promise<void>((resolve) => queue.push(resolve));
    return () => {
      running--;
      next();
    };
  };
}

export async function fetchAllReadmes(
  repos: Array<{ owner: string; name: string }>,
  token: string,
  concurrency = 5
): Promise<Map<string, string>> {
  const acquire = createSemaphore(concurrency);
  const results = new Map<string, string>();

  await Promise.all(
    repos.map(async ({ owner, name }) => {
      const release = await acquire();
      try {
        const content = await fetchReadme(owner, name, token);
        results.set(`${owner}/${name}`, content);
      } finally {
        release();
      }
    })
  );

  return results;
}
