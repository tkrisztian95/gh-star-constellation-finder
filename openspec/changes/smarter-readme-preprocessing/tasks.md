## 1. Implement preprocessReadme function

- [x] 1.1 Add `preprocessReadme(raw: string): string` function to `src/github/readmeFetcher.ts`
- [x] 1.2 Implement pass 1: strip HTML comments (`/<!--[\s\S]*?-->/g`)
- [x] 1.3 Implement pass 2: strip markdown badges (`/\[!\[.*?\]\(.*?\)\]\(.*?\)/g`)
- [x] 1.4 Implement pass 3: strip HTML badge anchors (`/<a[^>]*>\s*<img[^>]*>\s*<\/a>/gi`)
- [x] 1.5 Implement pass 4: strip inline markdown images (`/!\[.*?\]\(.*?\)/g`)
- [x] 1.6 Implement pass 5: strip TOC sections (heading named Table of Contents / TOC / Contents + content until next `##` heading)
- [x] 1.7 Collapse multiple consecutive blank lines to a single blank line
- [x] 1.8 Extract the first 1500 characters of the cleaned text as the leading prefix
- [x] 1.9 Scan cleaned text for first section matching Features / Key Features / About / What is it? (case-insensitive) and append up to 1500 chars of that section
- [x] 1.10 Assemble prefix + feature section content into a single string

## 2. Wire preprocessing into fetchReadme

- [x] 2.1 Call `preprocessReadme(decoded)` on the base64-decoded string before the `README_MAX_LENGTH` length check in `fetchReadme`
- [x] 2.2 Verify the existing truncation logic (`slice` + `... [truncated]`) still applies to the preprocessed result

## 3. Unit tests

- [x] 3.1 Test that HTML comments are removed
- [x] 3.2 Test that markdown badges are removed
- [x] 3.3 Test that HTML badge anchor elements are removed
- [x] 3.4 Test that inline markdown images are removed
- [x] 3.5 Test that a TOC section is removed and subsequent sections are preserved
- [x] 3.6 Test that leading description content (first 1500 chars) is always included
- [x] 3.7 Test that a Features section beyond the 1500-char prefix is appended
- [x] 3.8 Test that output is capped at `README_MAX_LENGTH` with `... [truncated]` marker
- [x] 3.9 Test that a README with none of the noise elements passes through unchanged
