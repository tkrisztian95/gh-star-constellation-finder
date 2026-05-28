import { buildCorpus } from "./buildCorpus.js";

const code = await buildCorpus(process.argv.slice(2));
process.exit(code);
