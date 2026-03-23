## 1. Update package.json

- [ ] 1.1 Remove `tsx` from `devDependencies`
- [ ] 1.2 Update `dev` script: `tsx --env-file=.env src/index.tsx` → `bun run src/index.tsx`
- [ ] 1.3 Update `start` script: `tsc && node dist/index.js` → `bun run src/index.tsx`

## 2. Reinstall dependencies with Bun

- [ ] 2.1 Delete `node_modules` and `package-lock.json`
- [ ] 2.2 Run `bun install` to generate `bun.lockb`

## 3. Verify

- [ ] 3.1 Run `bun run dev` and confirm the app starts correctly
- [ ] 3.2 Confirm `.env` variables are loaded without the `--env-file` flag
