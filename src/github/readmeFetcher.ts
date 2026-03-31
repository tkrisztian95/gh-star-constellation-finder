const README_MAX_LENGTH = 4000;
const PREFIX_LENGTH = 1500;
const SECTION_LENGTH = 1500;

export function preprocessReadme(raw: string): string {
  let text = raw;

  // Pass 1: strip HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Pass 2: strip markdown badges [![alt](img)](link)
  text = text.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "");

  // Pass 3: strip HTML badge anchors <a ...><img ...></a>
  text = text.replace(/<a[^>]*>\s*<img[^>]*>\s*<\/a>/gi, "");

  // Pass 4: strip <details> blocks (translation lists, nested TOCs)
  text = text.replace(/<details[^>]*>[\s\S]*?<\/details>/gi, "");

  // Pass 5: strip <picture> blocks (light/dark mode logos, CTAs)
  text = text.replace(/<picture[^>]*>[\s\S]*?<\/picture>/gi, "");

  // Pass 6: strip centered intro divs (sponsor banners, logo headers)
  text = text.replace(/<div\s+align="center"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Pass 7: strip inline markdown images ![alt](url)
  text = text.replace(/!\[.*?\]\(.*?\)/g, "");

  // Pass 8: strip back-to-top boilerplate links
  text = text.replace(/\*\*\[⬆\s*back to top\].*?\*\*/gi, "");

  // Pass 9: strip TOC sections
  text = text.replace(
    /^#{1,2}\s+(Table of Contents|TOC|Contents)\b[^\n]*\n[\s\S]*?(?=^#{1,2}\s)/im,
    "",
  );

  // Collapse multiple consecutive blank lines to one
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // Extract prefix (first 1500 chars)
  const prefix = text.slice(0, PREFIX_LENGTH);

  // Find first Features/About/Key Features/What is it? section
  // Use (?:^|\n) without m-flag so $ only matches end of string, avoiding
  // the lazy quantifier stopping at each line end with multiline $ matching.
  const sectionMatch = text.match(
    /(?:^|\n)#{1,3}\s+(?:Features|Key Features|About|What is it\?)[^\n]*\n([\s\S]*?)(?=(?:^|\n)#{1,3}\s|$)/i,
  );
  const sectionContent = sectionMatch ? sectionMatch[1].slice(0, SECTION_LENGTH) : "";

  const assembled = sectionContent ? prefix + "\n\n" + sectionContent : prefix;

  if (assembled.length > README_MAX_LENGTH) {
    return assembled.slice(0, README_MAX_LENGTH) + "... [truncated]";
  }

  return assembled;
}

async function fetchReadme(owner: string, repo: string, token: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        authorization: `token ${token}`,
        accept: "application/vnd.github.v3+json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`README fetch error for ${owner}/${repo}: ${message}`);
    return "";
  }

  if (response.status === 404) {
    return "";
  }

  if (!response.ok) {
    console.error(`README fetch error for ${owner}/${repo}: HTTP ${response.status}`);
    return "";
  }

  const body = (await response.json()) as { content?: string; encoding?: string };

  if (!body.content || body.encoding !== "base64") {
    return "";
  }

  const decoded = Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf-8");

  return preprocessReadme(decoded);
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
  concurrency = 5,
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
    }),
  );

  return results;
}
