---
name: "Work on issue"
description: Pick a GitHub issue and run the full idea→issue→spec→branch→PR workflow up through implementation
category: Workflow
argument-hint: "[issue number]"
tags: [workflow, github, openspec]
---

Drive the project's canonical workflow (see `CLAUDE.md` → "Workflow: idea → issue → spec → branch → PR") starting from a GitHub issue and stopping when implementation is in progress.

**Input**: Optionally pass an issue number (e.g. `/work-on-issue 12`). If omitted, list open issues and ask the user to pick one.

**Steps**

1. **Resolve the issue**

   - If the user passed a number, use it. Otherwise run:
     ```bash
     gh issue list --repo tkrisztian95/gh-star-constellation-finder --limit 50 --state open
     ```
     Then use the **AskUserQuestion tool** to let the user pick one of the listed issues. Do NOT auto-select — even if there is only one issue, confirm.
   - Once an issue number is locked in, fetch full details:
     ```bash
     gh issue view <N> --repo tkrisztian95/gh-star-constellation-finder
     ```
     Read the title, body, and labels.

2. **Investigate the affected code (read-only)**

   Before proposing anything, spend a few minutes orienting in the codebase so the proposal is grounded:
   - Use `grep`/`Read` (or spawn the `Explore` agent for broader sweeps) to locate the relevant files. The issue labels (`area:*`) usually point at the right module — cross-reference with `CLAUDE.md` → "Where things live".
   - If the issue is a bug, reproduce the failure mode in code: open the suspect file, identify the actual buggy lines, and check whether the same bug class lives elsewhere (e.g. the `input === ""` Enter bug hit five screens, not just the one reported).
   - If touching a function/class, run `mcp__gitnexus__impact` on it before reading more — keeps blast radius in mind from the start.

3. **Propose the scope to the user**

   In **2–3 sentences**, summarize: what the bug/feature is, where it lives, and what you'd change. Surface the tradeoff between a narrow fix and a broader one if relevant (e.g. fix one screen vs. fix the class of bug everywhere). Wait for the user to agree or redirect — do not start writing artifacts yet.

4. **Run `/opsx:propose`**

   Once scope is agreed, invoke the `opsx:propose` skill via the **Skill tool** with a description that:
   - Explains what's changing and why, in one paragraph
   - Ends with `Tracks #<N>` (the issue number)

   The skill will create the change folder under `openspec/changes/<slug>/` with `proposal.md`, `design.md`, `specs/.../spec.md`, and `tasks.md`. Verify the slug is obviously related to the issue (it doesn't have to match the title verbatim, but `issue ↔ change folder ↔ branch ↔ PR` must be trivially greppable per `CLAUDE.md`).

   After the skill returns, run `openspec validate --strict <slug>` to confirm everything is well-formed.

5. **Create the branch**

   Branch name MUST be the change slug verbatim (no `feat/`/`fix/` prefix — see `CLAUDE.md` → "Branches & git workflow"). Branch from `main`:
   ```bash
   git checkout main && git pull --ff-only && git checkout -b <slug>
   ```
   If the user already had uncommitted work on `main`, stop and ask — don't move their changes silently.

6. **Run `/opsx:apply`**

   Invoke the `opsx:apply` skill via the **Skill tool** with the change slug. The skill works through `tasks.md` one task at a time and pauses when:
   - A task is ambiguous
   - Implementation reveals a design issue
   - It hits a blocker

   Follow the project's per-section commit rule (see `CLAUDE.md` → "Best practices"): commit at the end of every numbered task group (`## N.`) once every checkbox in that group is `[x]`. Subject line: `<type>(<slug>): <section summary> (tasks N.x)`. Don't commit mid-section unless the user asks.

   **Before each `git commit`**, run `mcp__gitnexus__detect_changes` (`scope: "staged"`) and report the risk summary — the pre-commit hook enforces this anyway, but reporting it makes the diff legible.

7. **Hand off**

   When `/opsx:apply` finishes (or the user wants to stop), report:
   - What's done (tasks marked `[x]`)
   - What's left (tasks still `[ ]`)
   - The branch name and last commit
   - The remaining workflow steps the user owns: manual smoke test (for UI/TUI changes), `/opsx:archive`, push, and `gh pr create` with `Closes #<N>` in the body

   Do NOT push or open a PR unless the user explicitly asks — those steps are owner-driven.

**Guardrails**

- Always confirm scope with the user before invoking `/opsx:propose`. The 2-3-sentence proposal in step 3 is the gate.
- Never bundle multiple unrelated issues into one change. One issue → one change → one branch → one PR (per `CLAUDE.md`).
- If the user picked an issue that is actually two issues in a trench coat, stop and suggest filing a separate issue rather than expanding scope silently.
- If `docs/ideas.md` is non-empty, mention it once — those entries may need to become issues via `/issues-from-ideas` before they get forgotten. Don't block on it.
- Never bypass git hooks with `--no-verify`. If a hook fails, fix the underlying issue.
