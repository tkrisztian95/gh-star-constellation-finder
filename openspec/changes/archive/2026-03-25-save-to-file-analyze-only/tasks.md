## 1. CLI Argument Parsing

- [x] 1.1 Add `outputPath?: string` to the `CliArgs` type in `src/index.tsx`
- [x] 1.2 Parse `--output <path>` in `parseArgs()` and store the value in `cliArgs.outputPath`
- [x] 1.3 After parsing, if `outputPath` is set but `analyzeOnly` is false, print a usage error to stderr and exit with code `1`

## 2. File Output in runAnalyzeOnly

- [x] 2.1 Import `fs` from Node (`import fs from "fs"`) at the top of `src/index.tsx`
- [x] 2.2 In `runAnalyzeOnly()`, replace the unconditional `process.stdout.write` call with a branch: if `outputPath` is set, write the JSON to the file via `fs.writeFileSync`; otherwise write to stdout as before
- [x] 2.3 After writing the file, print a confirmation line to stderr: `Saved analysis to <outputPath>`

## 3. Verification

- [ ] 3.1 Run `--analyze-only --output /tmp/test-out.json` and confirm the file is created with valid JSON and stdout is empty
- [ ] 3.2 Run `--analyze-only` without `--output` and confirm JSON still appears on stdout
- [x] 3.3 Run `--output /tmp/test-out.json` without `--analyze-only` and confirm exit code is non-zero with an error on stderr
- [x] 3.4 Run `bun run build` (or equivalent type-check) to confirm no TypeScript errors
