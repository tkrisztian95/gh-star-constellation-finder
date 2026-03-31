## 1. Thread `allRepos` into ReviewScreen

- [x] 1.1 Add `repos: Repo[]` to the `review` phase state shape in `index.tsx`
- [x] 1.2 When transitioning to the `review` phase in `index.tsx`, include `allRepos` in the phase object
- [x] 1.3 Add `repos: Repo[]` to `ReviewScreenProps` and destructure it in `ReviewScreen`

## 2. Rename card — incoming repos preview

- [x] 2.1 Inside the rename card branch of `ReviewScreen`, derive `incomingRepos` by filtering `suggestions` for `move-to-list` entries whose `targetListId === "rename:" + current.listId`
- [x] 2.2 Render an "Moving in if accepted:" section listing up to 5 repos as `owner/name`; show a dimmed "…and N more" suffix when count exceeds 5; omit section entirely when list is empty

## 3. Rename card — existing unanalyzed repos preview

- [x] 3.1 Derive `existingUnanalyzed` by filtering `repos` for those whose `listIds` includes `current.listId` and whose `id` is not in the incoming repos set
- [x] 3.2 Render an "Already in list (not analyzed):" section with the same truncation logic (cap 5, dimmed suffix); omit when empty

## 4. Move card — post-rejection annotation

- [x] 4.1 In the move-to-list branch of `ReviewScreen`, add a helper that looks up the `rename-list` suggestion whose `"rename:" + s.listId === current.targetListId` and returns its decision from the live `decisions` map
- [x] 4.2 Render a dimmed note when the resolved decision is `"rejected"` or `"skipped"`: "Rename was declined — repo will be added to a newly created list '{targetListName}' instead"

## 5. Tests

- [x] 5.1 Test rename card renders incoming-repos section when move suggestions target the rename placeholder
- [x] 5.2 Test rename card truncates at 5 incoming repos with "…and N more"
- [x] 5.3 Test rename card omits incoming-repos section when no move suggestions target the placeholder
- [x] 5.4 Test rename card renders existing-unanalyzed section when `repos` has members with matching `listId`
- [x] 5.5 Test rename card excludes repos that appear in incoming suggestions from the unanalyzed section
- [x] 5.6 Test rename card omits unanalyzed section when all list members appear in suggestions
- [x] 5.7 Test move card shows rejection note when rename decision is `"rejected"`
- [x] 5.8 Test move card shows rejection note when rename decision is `"skipped"`
- [x] 5.9 Test move card shows no note when rename decision is `"accepted"`
- [x] 5.10 Test move card shows no note when rename decision is `undefined`
