---
name: Bug report
about: Something the tool does (or doesn't do) that doesn't match expectations
title: ""
labels: ["bug"]
assignees: []
---

<!--
Before filing, please:
- Search existing issues (open AND closed): https://github.com/tkrisztian95/gh-star-constellation-finder/issues
- Make sure you're on the latest release: https://github.com/tkrisztian95/gh-star-constellation-finder/releases
-->

## What happened

<!-- One or two sentences. What did you observe? -->

## What you expected

<!-- What should have happened instead? -->

## Repro steps

```bash
# The exact command you ran, including all flags:

```

If the issue only happens with specific repos or list configurations, briefly describe them.

## Environment

- **Tool version / binary tag or commit SHA:** <!-- e.g. v1.0.0, or git SHA if built from source -->
- **Bun version** (`bun --version`): <!-- only if you built from source -->
- **OS + arch** (`uname -smr`): <!-- e.g. darwin arm64, linux x86_64 -->
- **AI backend:** <!-- openai (model id?) / ollama (model id?) -->
- **Run mode:** <!-- TUI / --analyze-only -->

## Log excerpt

<!--
Paste the relevant lines from the JSONL log file. Default path:
$XDG_STATE_HOME/gh-star-constellation-finder/app.log
or wherever LOG_FILE points to.

Focus on `warn` and `error` lines around the failure. Run with
LOG_LEVEL=debug to capture per-repo / per-mutation traces. Redact any
PATs or other secrets before pasting.
-->

```jsonl

```

## Additional context

<!-- Anything else that might be relevant — flaky behaviour, what you tried, screenshots if a TUI rendering bug. -->
