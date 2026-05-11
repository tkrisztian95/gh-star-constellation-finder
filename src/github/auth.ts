import { graphql } from "@octokit/graphql";
import { logger } from "../logger.js";

export interface AuthResult {
  login: string;
  token: string;
  graphqlWithAuth: typeof graphql;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly reason: "missing_token" | "invalid_token" | "network_error",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function authenticate(): Promise<AuthResult> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new AuthError("Error: GITHUB_TOKEN environment variable is required", "missing_token");
  }

  // Check scopes and validate token via a raw fetch first
  let login: string;
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        authorization: `token ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: "{ viewer { login } }" }),
    });

    if (response.status === 401) {
      throw new AuthError("Error: GitHub token is invalid or expired", "invalid_token");
    }

    const scopes = response.headers.get("x-oauth-scopes") ?? "";
    const scopeList = scopes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const hasWriteScope = scopeList.some(
      (s) => s === "repo" || s === "public_repo" || s === "user",
    );

    if (!hasWriteScope) {
      logger.warn("GitHub token may lack write permissions for Lists; accept actions will fail", {
        scopes: scopeList,
      });
    }

    const body = (await response.json()) as {
      data?: { viewer?: { login?: string } };
      errors?: unknown[];
    };
    if (body.errors || !body.data?.viewer?.login) {
      throw new AuthError("Error: GitHub token is invalid or expired", "invalid_token");
    }
    login = body.data.viewer.login;
  } catch (error: unknown) {
    if (error instanceof AuthError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("401") ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("bad credentials")
    ) {
      throw new AuthError("Error: GitHub token is invalid or expired", "invalid_token");
    }
    throw new AuthError(`Error: GitHub authentication failed — ${message}`, "network_error");
  }

  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  return { login, token, graphqlWithAuth };
}
