<!--
Thanks for sending a PR! A few quick reminders from CONTRIBUTING.md:
- One issue per change, one change per PR.
- Non-trivial changes should land an OpenSpec proposal first.
- Reference the issue with "Closes #N" below so GitHub auto-closes on merge.
-->

## Summary

<!-- 1–3 bullets: what changed and why. Skip implementation detail — the diff covers that. -->

-

## Linked issue

Closes #

## Type of change

<!-- Pick one. Multiple boxes is a sign the PR is doing too much; consider splitting. -->

- [ ] Bug fix (`fix`)
- [ ] New feature (`feat`)
- [ ] Refactor — no behaviour change (`refactor`)
- [ ] Docs only (`docs`)
- [ ] Tooling / infra / chores (`chore`)
- [ ] Tests only (`test`)

## OpenSpec change

<!-- Required for non-trivial changes. Path under openspec/changes/, or "n/a" for tiny fixes. -->

`openspec/changes/<slug>/` — or **n/a (typo/one-line fix)**.

## Test plan

<!-- How did you verify this works? -->

- [ ] `bun run typecheck` clean
- [ ] `bun run lint` clean
- [ ] `bun run format:check` clean
- [ ] `bun run test` clean
- [ ] Manual smoke test:
- [ ] Verified `--analyze-only` headless parity (if pipeline-affecting)

## Breaking changes

<!-- Session JSON / cache format / CLI flags / env var names changing in incompatible ways? -->

- [ ] None
- [ ] Yes — described in `proposal.md` under a "Breaking changes" heading.

## Reviewer notes

<!-- Anything specific you want the reviewer to look at? Trade-offs you considered? Open questions? Leave blank if not applicable. -->
