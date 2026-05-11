import { graphql } from "@octokit/graphql";
import type { Repo, GitHubList } from "../types.js";
import { STARRED_REPOSITORIES_QUERY, USER_LISTS_QUERY } from "../graphql/queries.js";
import { logger } from "../logger.js";

interface GraphQLPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface GraphQLRepo {
  id: string;
  name: string;
  owner: { login: string };
  description: string | null;
  primaryLanguage: { name: string } | null;
  isArchived: boolean;
  stargazerCount: number;
  repositoryTopics: { nodes: Array<{ topic: { name: string } }> };
}

interface StarredReposResponse {
  viewer: {
    starredRepositories: {
      pageInfo: GraphQLPageInfo;
      nodes: GraphQLRepo[];
    };
  };
  headers?: Record<string, string>;
}

interface UserListsResponse {
  viewer: {
    lists: {
      nodes: Array<{
        id: string;
        name: string;
        description: string | null;
        items: { nodes: Array<{ id?: string }> };
      }>;
    };
  };
}

function mapRepo(node: GraphQLRepo): Repo {
  return {
    id: node.id,
    name: node.name,
    owner: node.owner.login,
    description: node.description ?? "",
    language: node.primaryLanguage?.name ?? null,
    isArchived: node.isArchived,
    stargazerCount: node.stargazerCount,
    topics: node.repositoryTopics.nodes.map((t) => t.topic.name),
    listIds: [],
  };
}

async function checkRateLimit(): Promise<void> {
  // @octokit/graphql doesn't expose headers directly; we use a raw fetch check
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;

  const response = await fetch("https://api.github.com/rate_limit", {
    headers: { authorization: `token ${token}` },
  });

  const remaining = parseInt(response.headers.get("x-ratelimit-remaining") ?? "999", 10);
  const reset = parseInt(response.headers.get("x-ratelimit-reset") ?? "0", 10);

  if (remaining < 50) {
    const waitMs = Math.max(0, reset * 1000 - Date.now());
    const waitSec = Math.ceil(waitMs / 1000);
    logger.warn("GitHub REST rate limit nearly exhausted", { remaining, waitSec });
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export async function fetchStarredRepos(graphqlWithAuth: typeof graphql): Promise<Repo[]> {
  const repos: Repo[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  const start = Date.now();

  while (true) {
    if (pageCount > 0 && pageCount % 5 === 0) {
      await checkRateLimit();
    }

    const result: StarredReposResponse = await graphqlWithAuth<StarredReposResponse>(
      STARRED_REPOSITORIES_QUERY,
      { cursor },
    );

    const { nodes, pageInfo }: { nodes: GraphQLRepo[]; pageInfo: GraphQLPageInfo } =
      result.viewer.starredRepositories;
    repos.push(...nodes.map(mapRepo));

    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
    pageCount++;
  }

  logger.debug("starred repos paginated", {
    pages: pageCount + 1,
    repoCount: repos.length,
    durationMs: Date.now() - start,
  });
  return repos;
}

export async function fetchUserLists(graphqlWithAuth: typeof graphql): Promise<GitHubList[]> {
  const result = await graphqlWithAuth<UserListsResponse>(USER_LISTS_QUERY);

  return result.viewer.lists.nodes.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description ?? "",
    repoIds: list.items.nodes
      .filter((item): item is { id: string } => typeof item.id === "string")
      .map((item) => item.id),
  }));
}
