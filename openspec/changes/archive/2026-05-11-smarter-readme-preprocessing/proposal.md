## Why

The current README truncation in `readmeFetcher.ts` blindly slices the first 4000 characters, which often wastes the token budget on badges, HTML comments, and tables of contents rather than the description and features content that actually signals a repo's purpose. Preprocessing to remove noise before truncating ensures the AI receives the most categorization-relevant content within the same token budget.

## What Changes

- Add a `preprocessReadme` function that strips noise from raw README markdown before truncation
- Noise removal passes (in order):
  - Remove HTML comments (`<!-- ... -->`)
  - Remove markdown badges (`[![...](...)](...)`)
  - Remove HTML badge links (shields.io and similar)
  - Remove inline images (`![...](...)`)
  - Remove Table of Contents sections (header + list until the next `##` header)
- After stripping noise, keep the first ~1500 characters of the cleaned text (the elevator pitch)
- Append content from `## Features`, `## About`, `## What is it?` sections if present
- Apply `README_MAX_LENGTH` cap and `[truncated]` tag to the assembled result
- The final output contract for callers is unchanged (a plain string, possibly `[truncated]`)

## Capabilities

### New Capabilities
- `readme-preprocessing`: Noise-stripping and signal-extraction logic applied to raw README content before truncation

### Modified Capabilities
- (none — no existing spec covers README fetching behavior at the requirements level)

## Impact

- `src/github/readmeFetcher.ts`: Primary change — add preprocessing step inside `fetchReadme`
- No changes to callers; return type and shape are unchanged
- No new dependencies required (pure string manipulation)
- Existing tests in `src/__tests__/` may need a new unit test for the preprocessing function
