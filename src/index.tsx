import { initLogger, logger } from "./logger.js";
import { main } from "./orchestration/main.js";

const headless = process.argv.slice(2).includes("--analyze-only");
initLogger({ headless });

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error("main exited with error", { message });
  process.exit(1);
});
