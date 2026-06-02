import { main } from "./run.js";

const code = await main(process.argv.slice(2));
process.exit(code);
