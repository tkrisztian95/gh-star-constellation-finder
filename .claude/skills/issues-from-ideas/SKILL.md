---
name: issues-from-ideas
description: Turn docs/ideas.md into GitHub issues in tkrisztian95/gh-star-constellation-finder. Each line becomes one issue with a cleaned title, verbatim body, and label suggestions from the project taxonomy. Dry-runs first; user confirms before bulk-create; clears the file when done.
trigger: /issues-from-ideas
---

# /issues-from-ideas

Drain `docs/ideas.md` into GitHub issues, one issue per non-empty line.

## Inputs

- `docs/ideas.md` — bullet list or plain lines, one idea per line. Sub-bullets / multi-line ideas are not supported; collapse first.
- Repo: `tkrisztian95/gh-star-constellation-finder` (hard-coded — this is a project-local skill).

## Workflow

1. **Read** `docs/ideas.md`. If empty or missing → tell user, stop.
2. **Parse** each non-empty line (strip leading `- `, trim). Skip blank lines.
3. **For each line, propose**:
   - **Title** — short, action-leading, no trailing period. Fix obvious typos in the title only, never in the body.
   - **Body** — the original line verbatim (typos, casing, all of it). This preserves the user's exact phrasing for future-them.
   - **Labels** — pick from the taxonomy in `## Label taxonomy` below. Apply zero or more labels. Combine one `area:*` + one type label (`bug` / `enhancement` / `type:refactor` / `type:chore` / `documentation`) when both are clear; skip a label rather than guess.
4. **Dry-run table** — render `# | Title | Labels` to the user. Body is verbatim from ideas.md so no need to re-show it. Wait for explicit confirmation (`yes` / `go` / `proceed`). Do not auto-proceed.
5. **Create issues in parallel** — one `gh issue create` per idea, all dispatched in a single tool-call block:
   ```
   gh issue create --repo tkrisztian95/gh-star-constellation-finder \
     --title "<title>" --body "<verbatim line>" \
     --label "<label1>" --label "<label2>"
   ```
   Omit `--label` flags entirely when no labels apply.
6. **Verify** — collect returned URLs, render a numbered table mapping idea → issue number.
7. **Clear `docs/ideas.md`** to empty (write empty content, not delete). Do NOT commit unless the user asks.

## Label taxonomy

Existing repo labels (do not recreate):

- `bug` — defect in shipped behavior
- `enhancement` — new feature / capability
- `documentation` — docs, README, comments
- `good first issue`, `help wanted`, `question`, `duplicate`, `invalid`, `wontfix` — meta, used sparingly

Project-specific labels (created via `## Bootstrap` below):

**Area** (`#1d76db`) — pick one per issue when applicable:

- `area:tui` — Ink components, screens, key bindings, prompt layout
- `area:headless` — `--analyze-only`, AI-tool harness mode
- `area:ai` — provider abstraction, OpenAI/Ollama, prompt construction
- `area:github-api` — Octokit GraphQL, list mutation, scopes
- `area:cache` — analysis cache, prior-run reuse
- `area:cli` — flag parsing, `--help`, argv handling
- `area:telemetry` — Langfuse tracing, PostHog analytics, file logging
- `area:session` — session JSON save/load, filename conventions

**Type** (`#fbca04` / `#fef2c0`) — only when not covered by `bug` / `enhancement` / `documentation`:

- `type:refactor` — non-behavioral cleanup, rename, extract
- `type:chore` — tooling, infra, deps, CI; no user-visible change

Do not invent new labels mid-run. If an idea doesn't fit, leave it unlabeled and flag it in the dry-run for the user to triage.

## Bootstrap

Run once per repo to create the project-specific labels (idempotent — re-running prints "already exists" warnings which are fine):

```bash
for area in tui headless ai github-api cache cli telemetry session; do
  gh label create "area:$area" --repo tkrisztian95/gh-star-constellation-finder --color 1d76db --description "Area: $area" 2>/dev/null || true
done
gh label create "type:refactor" --repo tkrisztian95/gh-star-constellation-finder --color fbca04 --description "Non-behavioral cleanup" 2>/dev/null || true
gh label create "type:chore"    --repo tkrisztian95/gh-star-constellation-finder --color fef2c0 --description "Tooling, infra, deps — no user impact" 2>/dev/null || true
```

## Rules

- **Body is verbatim.** Don't fix typos, expand abbreviations, or reformat the line. The body is the user's raw thought; the title is the polished version. This makes future grep-by-original-phrasing reliable.
- **One issue per line.** If a line bundles multiple ideas, ask the user to split before proceeding — do not auto-split.
- **Never delete `docs/ideas.md`.** Empty it. The file is the inbox; deletion would break the workflow.
- **Don't commit.** Clearing the file is a working-tree change. Leave staging/committing to the user.
- **Don't add labels speculatively.** If unsure, leave it unlabeled. False labels are worse than missing labels — they get filtered on and the issue gets lost.
- **No emojis in titles or labels.** Decorative-only, and this is a CLI/dev project (see project CLAUDE.md).
- **Token scope.** `gh issue create` works with `repo` scope. Adding to a Projects v2 board needs `project` scope (`gh auth refresh -s project`) — out of scope for this skill unless explicitly asked.

## Failure modes

- **Rate limit / network error mid-batch** → report which ideas succeeded (URLs returned) and which didn't. Do not retry automatically; ask the user. Do not clear `docs/ideas.md` if any issue failed — leave the unsent lines in place.
- **Empty file** → tell user, stop.
- **Multi-line idea (sub-bullets)** → stop, ask user to flatten.
- **Idea already exists as an open issue** (substring match on title) → flag in dry-run, don't auto-skip; user decides.
