import { existsSync, readFileSync } from "node:fs";

import { logger } from "../logger.js";

/**
 * Serve a built constellation.json as an interactive force-graph web page.
 * Read-only and offline — no GitHub/model needed. The page (viz.html) fetches
 * ./constellation.json from this same server.
 */
export function serveConstellation(jsonPath: string, port: number): void {
  if (!existsSync(jsonPath)) {
    process.stderr.write(
      `No constellation at ${jsonPath}. Build it first: --constellation <dir>\n`,
    );
    process.exit(1);
  }
  const html = readFileSync(new URL("./viz.html", import.meta.url), "utf8");

  Bun.serve({
    port,
    fetch(req) {
      const { pathname } = new URL(req.url);
      if (pathname === "/constellation.json") {
        return new Response(readFileSync(jsonPath, "utf8"), {
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    },
  });

  logger.info("constellation viz serving", { port, jsonPath });
  process.stderr.write(
    `\n  ⭐ Constellation viz → http://localhost:${port}   (${jsonPath})\n  Ctrl-C to stop.\n\n`,
  );
}
