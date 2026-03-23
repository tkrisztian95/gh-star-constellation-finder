## ADDED Requirements

### Requirement: Bun is used as the TypeScript runtime
The project SHALL use Bun to execute TypeScript source files directly, without a separate compilation step.

#### Scenario: Dev script runs TypeScript directly
- **WHEN** the developer runs `bun run dev`
- **THEN** Bun executes `src/index.tsx` directly without invoking `tsc`

#### Scenario: Start script runs TypeScript directly
- **WHEN** the developer runs `bun run start`
- **THEN** Bun executes `src/index.tsx` directly without a prior compile step

### Requirement: Environment variables are loaded natively
The project SHALL rely on Bun's native `.env` file loading, removing the explicit `--env-file` flag.

#### Scenario: .env loaded automatically
- **WHEN** the app starts via `bun run dev` or `bun run start`
- **THEN** variables defined in `.env` are available in `process.env` without passing `--env-file`

### Requirement: tsx is removed as a dependency
The project SHALL NOT include `tsx` in `devDependencies`.

#### Scenario: tsx absent from package.json
- **WHEN** `package.json` is inspected
- **THEN** `tsx` does not appear in `devDependencies` or `dependencies`
