## Context

The project is a small hobby CLI/TUI app built with TypeScript, Ink (React for terminals), and the OpenAI + GitHub APIs. The current toolchain has two separate tools for a single runtime:

- **Dev**: `tsx` — a wrapper that runs TypeScript files via Node.js
- **Prod**: `tsc` (compile) + `node` (run)

Bun is a JavaScript runtime that natively executes TypeScript, includes a fast package manager, and loads `.env` files automatically. All current dependencies are Node.js-compatible and run on Bun.

## Goals / Non-Goals

**Goals:**
- Replace `tsx` with `bun` for development execution
- Replace `tsc && node` with `bun run` for production
- Remove `tsx` as a dev dependency
- Drop the `--env-file=.env` flag (Bun loads `.env` natively)

**Non-Goals:**
- Changing any application logic or behavior
- Migrating tests (none currently exist)
- Adopting Bun-specific APIs (e.g., `Bun.file`, `Bun.serve`)
- Using `bun build` for bundling (out of scope for a CLI tool)

## Decisions

### Use `bun run src/index.tsx` for both dev and prod

**Decision**: Both `dev` and `start` scripts will use `bun run src/index.tsx` directly, eliminating the compile-then-run step.

**Rationale**: Bun executes TypeScript natively with no compilation step needed. For a CLI tool this size, there's no benefit to a separate compile step. If a compiled artifact is needed in the future, `bun build` can be added.

**Alternatives considered**:
- Keep `tsc` for type-checking in CI — deferred; TypeScript errors surface at dev time via editor integration. Can be added back as a CI step independently.
- Use `bun build --compile` to produce a standalone binary — out of scope for now.

### Keep `typescript` dev dependency

**Decision**: Retain `typescript` in `devDependencies` for editor type-checking via `tsconfig.json`.

**Rationale**: Bun executes TypeScript but does not type-check. The TypeScript language server still needs the `typescript` package for IDE integration.

## Risks / Trade-offs

- **ink's native addon (yoga-layout)** → Bun supports Node.js native addons (`.node` files). `yoga-layout` ships a prebuilt binary and works in Bun. Risk is low; verify by running the app after migration.
- **Loss of explicit type-checking in `start` script** → Mitigation: run `tsc --noEmit` separately in CI if type safety gates are needed.

## Migration Plan

1. Remove `tsx` from `devDependencies`
2. Update `package.json` scripts
3. Delete `node_modules` and `package-lock.json`
4. Run `bun install`
5. Smoke-test with `bun run dev`
