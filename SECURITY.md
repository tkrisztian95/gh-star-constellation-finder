# Security Policy

## Supported versions

This is a hobby project. Only the latest release on the [Releases page](https://github.com/tkrisztian95/gh-star-constellation-finder/releases) receives fixes. Older tags will not be patched — please update to the latest before reporting a vulnerability that may already be addressed.

## What's in scope

Anything that puts a user's data or account at risk through the tool's normal use:

- The compiled CLI binary's handling of the GitHub personal access token (PAT) it asks for at startup.
- The data the tool sends to the OpenAI API or to a configured Langfuse / PostHog instance (see [README](./Readme.md#-disclaimer) for what's normally sent).
- The GraphQL mutations the tool issues against the user's lists and starred repos.
- The [release workflow](./.github/workflows/release.yml) and the install script ([install.sh](./install.sh)) — anything that affects the integrity of the published binaries.
- Supply-chain concerns about the dependencies declared in [package.json](./package.json).

## What's out of scope

- Issues in upstream dependencies that don't affect users of this tool — please report those to the upstream project. We track advisories via `bun audit` in CI.
- Bugs in user-supplied AI prompts or Ollama models. The tool ships only the prompts under [src/ai/prompts.ts](./src/ai/prompts.ts).
- Misuse of the tool against an account or repos you don't own.

## How to report

Please **do not** open a public GitHub issue for security reports.

Use one of these private channels:

1. **Preferred — GitHub Security Advisory.** Open a draft advisory at <https://github.com/tkrisztian95/gh-star-constellation-finder/security/advisories/new>. GitHub keeps the report private until we agree to publish it together with a fix.
2. **Email.** Send the report to **ktothdev@gmail.com** with the subject prefix `[security] gh-star-constellation-finder:`. PGP is not currently set up; if you need encrypted transport, ask in your first message and we can arrange a key exchange.

Please include, where applicable:

- A concise description of the issue and its potential impact.
- Reproduction steps or a proof-of-concept (a minimal repro is far more useful than a screenshot).
- The version (binary tag or commit SHA) where you observed it.
- Your assessment of severity, if you have one (CVSS optional).

## What you can expect

This is a single-maintainer project, so response times are best-effort:

- **Acknowledgement:** within 7 days.
- **Initial triage assessment:** within 14 days.
- **Fix and coordinated disclosure:** timing depends on the severity and on how complex the fix is; we'll keep you in the loop and credit you in the release notes unless you ask not to be named.

If a fix turns out to be infeasible or out of scope, we'll explain why rather than going silent.

## Hall of fame

Reporters who help improve the security of this project will be listed here (with permission) after the issue is fixed and disclosed.
