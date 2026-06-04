/**
 * Minimal MCP server over the star constellation.
 *
 * Exposes the constellation (built by `--constellation`) to MCP clients
 * (Claude Desktop / Cursor / Cline) as queryable tools. Standalone: reads a
 * saved `constellation.json` — no GitHub, no model, no graphology runtime.
 *
 *   CONSTELLATION_PATH=out/constellation.json bun run src/mcp/server.ts
 *
 * Tools:
 *   related_stars(repo, k?) — repos most related to `repo` by shared tech
 *   list_stars()            — all repo ids in the constellation
 *
 * NOTE: stdout is the MCP transport — never write logs there; diagnostics go to stderr.
 */
import { readFileSync } from "node:fs";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { relatedFromJson, type ConstellationJson } from "../constellation/graph.js";

const PATH = process.env.CONSTELLATION_PATH ?? "out/constellation.json";

function loadGraph(): ConstellationJson {
  return JSON.parse(readFileSync(PATH, "utf8")) as ConstellationJson;
}

const server = new McpServer({ name: "star-constellation", version: "0.1.0" });

server.tool(
  "related_stars",
  "Find the starred repos most related to a given repo, by shared technical entities (languages, frameworks, tools). Returns repos ranked by relatedness with the shared entities.",
  {
    repo: z.string().describe('repo id as "owner/name"'),
    k: z.number().int().positive().optional(),
  },
  async ({ repo, k }) => {
    let graph: ConstellationJson;
    try {
      graph = loadGraph();
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Could not load constellation from ${PATH}: ${e instanceof Error ? e.message : e}. Generate it with --constellation.`,
          },
        ],
      };
    }
    if (!graph.nodes.some((n) => n.id === repo)) {
      return {
        content: [
          {
            type: "text",
            text: `Repo "${repo}" not in the constellation. Use list_stars to see available repos.`,
          },
        ],
      };
    }
    const related = relatedFromJson(graph, repo, k ?? 5);
    return { content: [{ type: "text", text: JSON.stringify({ repo, related }, null, 2) }] };
  },
);

server.tool("list_stars", "List all repo ids present in the star constellation.", {}, async () => {
  let graph: ConstellationJson;
  try {
    graph = loadGraph();
  } catch (e) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Could not load constellation from ${PATH}: ${e instanceof Error ? e.message : e}`,
        },
      ],
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          graph.nodes.map((n) => n.id),
          null,
          2,
        ),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`star-constellation MCP server ready (constellation: ${PATH})\n`);
