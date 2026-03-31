## Context

`src/github/readmeFetcher.ts` fetches READMEs from the GitHub API and currently truncates them with a hard character slice at 4000 chars before passing the content to AI analysis. READMEs frequently lead with large blocks of badges, HTML comments, and a table of contents — content that carries zero categorization signal but consumes a significant share of the token budget. The fix is entirely contained within `readmeFetcher.ts`; no callers change.

## Goals / Non-Goals

**Goals:**
- Extract a `preprocessReadme(raw: string): string` pure function that removes noise and assembles a signal-dense string
- Apply preprocessing inside `fetchReadme` before the length check and truncation
- Keep the same external contract: callers receive a plain string, possibly ending with `... [truncated]`
- Keep `README_MAX_LENGTH` as the final cap (unchanged at 4000)

**Non-Goals:**
- Changing the concurrency/semaphore logic
- Fetching or parsing README from formats other than base64 GitHub API response
- Semantic parsing or NLP — regex-only, no new dependencies
- Changing how the README is used downstream (AI prompt construction, storage)

## Decisions

### Multi-pass regex stripping over a single large regex
Apply removal in discrete passes rather than one combined regex. Each pass targets a specific noise type, making the logic easy to test, adjust, and extend independently.

**Passes (in order):**
1. Strip HTML comments: `/<!--[\s\S]*?-->/g`
2. Strip markdown badges: `/\[!\[.*?\]\(.*?\)\]\(.*?\)/g`
3. Strip HTML badge anchors: `/<a[^>]*>\s*<img[^>]*>\s*<\/a>/gi`
4. Strip inline images: `/!\[.*?\]\(.*?\)/g`
5. Strip TOC section: `/^#{1,2}\s+(Table of Contents|TOC|Contents)\b.*?(?=^#{1,2}\s)/ims`
6. Collapse runs of blank lines to a single blank line

### Signal extraction: prefix + targeted sections
Rather than truncating the cleaned text directly, assemble the result in two parts:
1. **Prefix**: first 1500 characters of the cleaned text — almost always the project title, tagline, and primary description
2. **Feature sections**: scan for `## Features`, `## Key Features`, `## About`, `## What is it?` headers (case-insensitive) and append their content (up to 1500 chars each, first match only)

The assembled string is then passed through the existing `README_MAX_LENGTH` cap and `[truncated]` tag.

**Rationale:** Pure prefix extraction after cleaning already improves quality. The targeted section extraction captures the features list which is the second-highest-value signal for categorisation, at the cost of one linear scan.

**Alternative considered:** Extract only the prefix and skip targeted sections. Simpler, but leaves features content on the floor when the description is long. Rejected.

### No new dependencies
All regex operations use built-in `String.prototype.replace` and `RegExp`. No markdown parser (e.g., `remark`) is introduced to avoid a new runtime dependency for what is achievable with straightforward regexes.

## Risks / Trade-offs

- **Overly aggressive TOC stripping** — The TOC regex relies on the section being followed by another `##` heading. If a README has a TOC at the end with no following header, it will not be stripped. Acceptable: the remaining content would still be relevant.
- **Badge regex misses exotic badge HTML** — The HTML badge regex targets `<a><img></a>` patterns. Unusual badge markup may survive. Mitigation: HTML comments are stripped first, which removes most badge-wrapping comment blocks; residual unmatched badges are low-token-count noise.
- **Feature section extraction may grab large sections** — The per-section cap of 1500 chars prevents runaway growth. The total is still bounded by `README_MAX_LENGTH`.
- **Regex edge cases in pathological READMEs** — Regexes use non-greedy quantifiers to prevent catastrophic backtracking. The `[\s\S]*?` pattern with the `s` flag is safe for typical README sizes.

## Migration Plan

1. Add `preprocessReadme` function to `readmeFetcher.ts`
2. Call it on the decoded string before the length check
3. Add unit tests covering each stripping pass and the extraction logic
4. No data migration needed — processed content is not persisted differently
5. Rollback: revert the single function change; no schema or API changes involved
