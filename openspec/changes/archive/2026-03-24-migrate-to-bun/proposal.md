## Why

The project currently uses `tsx` for development and `tsc + node` for production, requiring multiple tools for a simple CLI app. Migrating to Bun consolidates the runtime, TypeScript execution, and package manager into a single tool, reducing setup friction and improving install/startup speed.

## What Changes

- Replace `tsx` with `bun` as the TypeScript runner for development
- Replace `tsc && node dist/index.js` build+run pipeline with `bun run`
- Remove `tsx` dev dependency
- Update `package.json` scripts to use Bun commands
- Native `.env` loading means `--env-file=.env` flag can be dropped

## Capabilities

### New Capabilities

- `bun-toolchain`: Build and dev toolchain configuration using Bun as the runtime, package manager, and TypeScript executor.

### Modified Capabilities

## Impact

- `package.json`: scripts and devDependencies updated
- `node_modules/`: replaced by Bun's install
- Development workflow: `npm run dev` → `bun run dev`, `npm start` → `bun run start`
- No runtime behavior changes — all dependencies (ink, react, openai, @octokit/graphql, zod) are compatible with Bun
