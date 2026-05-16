---
name: "Ship patch"
description: Branch, bump patch version, update CHANGELOG, commit, push, and open a PR for the changes already in the working tree
category: Workflow
argument-hint: "[commit subject]"
tags: [workflow, release, git, github]
---

Ship the changes already in the working tree as a single-commit patch-release PR. Handles the repetitive ceremony around `CLAUDE.md` → "Release-sync rule" and "Branches & git workflow" so the user can stay focused on the actual code change.

**Input**: optional one-line commit subject. If omitted, propose one from the diff and confirm.

**Preconditions** (bail with a clear message, don't try to recover silently)

1. Current branch is `main`. If not, stop — the user is probably already on a feature branch and this command is the wrong tool.
2. Working tree has staged or unstaged changes (other than `package.json`/`CHANGELOG.md`). If the only modifications are to those two files, stop — there's nothing to ship.
3. `git config user.email` returns `ktothdev@gmail.com` (per `~/Git/Hobby/CLAUDE.md`). If not, stop and flag the conditional-include rule is broken.
4. `main` is up to date with `origin/main` (`git fetch origin main` then check `git rev-list --count main..origin/main` is 0). If behind, stop and ask the user to pull first.

**Steps**

1. **Summarise the diff**

   Run `git status` and `git diff --stat`. List the modified files in 1–3 lines so the user can sanity-check before anything is committed.

2. **Propose `<type>(<scope>): <subject>`**

   Pick a Conventional Commits type by inspecting what changed:
   - `docs/**` or `README.md` / `CHANGELOG.md` (alone) → `docs`
   - `*.test.ts` only → `test`
   - `src/**` with new behaviour visible to users → `feat`
   - `src/**` fixing a bug → `fix`
   - Tooling / config / lockfile only → `chore`
   - Behaviour-preserving restructure → `refactor`

   If `$ARGUMENTS` is non-empty, use it as the subject verbatim and only infer the type. Otherwise propose subject + type and ask the user to confirm or override before continuing. Subject should be imperative, lowercase after the prefix, ≤ 72 chars.

3. **Derive the slug + branch name**

   Slug: lowercase the subject, replace non-alphanumerics with `-`, collapse repeats, trim, cap at ~6 words. Branch: `<type>/<slug>`.

4. **Bump the patch version**

   Read `package.json`, parse `version` as `X.Y.Z`, bump to `X.Y.(Z+1)`. Edit the `"version": "<old>"` line — do not run `npm version` (we're Bun-only, and that would touch git anyway).

5. **Update `CHANGELOG.md`**

   - Insert a new `## [<new-version>] — <YYYY-MM-DD>` section directly above the most recent existing version section. Use today's date in the `currentDate` context.
   - Group bullets under the appropriate Keep-a-Changelog heading (`Added` / `Changed` / `Fixed` / `Removed` / `Deprecated` / `Security`) — derive from the diff and the commit subject. One bullet per logical change. Match the prose style of the existing `[0.1.x]` sections (full sentences, link issues/PRs where relevant, prefer concrete details over marketing language).
   - Move any qualifying bullets out of the `## [Unreleased]` block into the new section. If `Unreleased` ends up empty, restore the "_Nothing yet — …_" placeholder (preserve the milestone link).
   - Update the comparison links at the bottom:
     - `[Unreleased]: …compare/v<new>...HEAD` (replace `v<old>` with `v<new>`)
     - Add `[<new>]: …compare/v<old>...v<new>` immediately above the existing `[<old>]: …` line.

6. **Create the branch**

   ```bash
   git checkout -b <type>/<slug>
   ```
   The uncommitted changes ride along automatically.

7. **Verify quality gates** (must all pass before commit)

   ```bash
   bun run typecheck
   bun run lint
   bun run test
   ```
   If any fail, stop and surface the error — do not try to "fix" the failure as part of shipping. The user's change is broken; that's a code problem, not a ceremony problem.

8. **Run change detection**

   Call `mcp__gitnexus__detect_changes` with `scope: "unstaged"` (then `"staged"` after `git add`). Report risk level and any affected execution flows in one line. If risk is HIGH or CRITICAL, stop and surface — don't auto-ship dangerous changes.

9. **Single commit**

   Stage every modified file with explicit paths (never `git add -A`/`.`). Commit subject = the agreed `<type>(<scope>): <subject>`. Body = 2–4 lines explaining the **why**, not the what. Use a HEREDOC so formatting survives. Include the `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer per the global commit template.

10. **Push with upstream**

    ```bash
    git push -u origin <type>/<slug>
    ```
    Never `--no-verify`. If `pre-push` rejects (e.g. release-sync mismatch), fix the underlying issue and retry — do not bypass.

11. **Open the PR**

    ```bash
    gh pr create --title "<commit-subject>" --body "$(cat <<'EOF'
    ## Summary

    - <one-line per bullet, mirroring the CHANGELOG entry>

    ## Test plan

    - [x] `bun run typecheck`
    - [x] `bun run lint`
    - [x] `bun run test`
    - [ ] <manual verification step appropriate to the change, e.g. "ran `bun run dev --help` and confirmed Examples block renders cleanly">

    🤖 Generated with [Claude Code](https://claude.com/claude-code)
    EOF
    )"
    ```

    **Issue linking:** If the user supplied an issue number (`/ship-patch "fix bug" #42` or similar), append `Closes #42` as the last line above the Claude footer. Otherwise omit the `Closes` line and flag in your end-of-turn summary that the issue↔PR link is missing per `CLAUDE.md` — the user can paste it in if they want it.

12. **Report**

    One sentence: PR URL, commit SHA, new version. Nothing else.

**Guardrails**

- **Patch only.** This command bumps `Z` in `X.Y.Z`. For minor or major bumps (breaking changes, new public surface), tell the user to do it manually — those want a `proposal.md` and a deliberate decision, not a one-shot command.
- **No tag.** This command never pushes a `v*` tag. Tagging + GitHub Release is a separate, deliberate step (`git tag -a vX.Y.Z … && git push origin vX.Y.Z`). The pre-push hook will then verify `package.json` + `CHANGELOG.md` are in sync, which is exactly what this command set up.
- **No post-merge cleanup.** Branch deletion is handled by the repo's `delete_branch_on_merge` setting on GitHub. Locally, the user can `git fetch -p` or run a separate cleanup command when they want.
- **One commit, by design.** Don't split into multiple commits "for clarity" — that's what the changelog is for. If the change is large enough to warrant per-section commits, it's too large for `/ship-patch` and should go through `/opsx:propose` instead.
- **Never bypass hooks.** Husky, pre-commit, pre-push — all must pass. If they fail, fix the underlying issue.
