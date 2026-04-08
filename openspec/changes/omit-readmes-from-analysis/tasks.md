## 1. CLI Args

- [ ] 1.1 Add `noReadmes: boolean` field (default `false`) to the `CliArgs` interface in `src/cli/args.ts`
- [ ] 1.2 Parse `--no-readmes` flag in `parseArgs` and set `result.noReadmes = true`

## 2. Config

- [ ] 2.1 Add `omitReadmes: boolean` field (default `false`) to `AppConfig` and to `DEFAULTS` in `src/config.ts`

## 3. Interactive Mode

- [ ] 3.1 In `src/orchestration/main.tsx`, compute `skipReadmes = cliArgs.noReadmes || process.env.NO_READMES?.toLowerCase() === "true" || readConfig().omitReadmes` before the fetching phase
- [ ] 3.2 Conditionally skip `fetchAllReadmes` when `skipReadmes` is true; pass an empty `Map` to `runAnalysis` instead

## 4. Analyze-Only Mode

- [ ] 4.1 In `src/cli/modes.ts` (`runAnalyzeOnly`), apply the same `skipReadmes` logic before the `fetchAllReadmes` call
- [ ] 4.2 Pass an empty `Map` (or skip the call) when `skipReadmes` is true

## 5. .env.example

- [ ] 5.1 Add `# NO_READMES=true` as a commented-out optional entry in `.env.example` with a brief description

## 6. Tests

- [ ] 6.1 Add unit tests for `parseArgs` covering `--no-readmes` present and absent
- [ ] 6.2 Add unit tests for `readConfig` covering missing `omitReadmes` field (defaults to `false`) and explicit `true`
- [ ] 6.3 Add unit tests for the `skipReadmes` resolution covering: flag wins, env var wins, config wins, all false
