## Why

Users can star hundreds of repositories but currently have no way to focus only on repos that haven't been assigned to any list yet. The only list-related control available is strategy selection for _creating_ lists, leaving users with no filtering tool for the review/cleanup workflow of organizing unclassified stars.

## What Changes

- Add a toggle or filter option to the repo display that shows only starred repos not present in any existing list.
- The filter applies at the UI level, narrowing the visible repo set without affecting the underlying data or analysis.
- Users can quickly see what still needs to be organized after previous runs have placed some repos into lists.

## Capabilities

### New Capabilities

- `unlisted-repos-filter`: A filter mode that hides repos already assigned to at least one list, surfacing only unorganized starred repos for the user's attention.

### Modified Capabilities

<!-- No existing spec-level requirements are changing. -->

## Impact

- UI layer: filter control added to the repo browsing/display step.
- Logic layer: needs access to the set of already-listed repos (from saved results or current session state) to evaluate membership.
- No breaking changes to existing list creation, analysis, or save flows.
