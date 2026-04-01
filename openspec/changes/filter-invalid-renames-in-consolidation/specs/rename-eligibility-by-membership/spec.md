## ADDED Requirements

### Requirement: rename-list is only emitted when analyzed repos provide membership evidence
When `allow-rename` strategy is active, the system SHALL only emit a `rename-list` suggestion for an unclaimed existing list `L` targeting category `C` if at least one analyzed repo whose `analysis.category` (case-insensitively, trimmed) equals `C` has `L.id` in its `repo.listIds`. If no such repo exists, the `create-list` suggestion for `C` SHALL remain unchanged and list `L` SHALL NOT be consumed by the rename-pairing loop.

#### Scenario: Repo in unclaimed list categorized as the target category — rename is emitted
- **WHEN** strategy is `allow-rename`, an unclaimed list `L` named "ML" exists, and at least one analyzed repo currently in `L` was categorized as "Machine Learning"
- **THEN** the system SHALL emit a `rename-list` suggestion renaming `L` from "ML" to "Machine Learning" and SHALL NOT emit a `create-list` for "Machine Learning"

#### Scenario: No analyzed repo in unclaimed list belongs to the target category — rename is suppressed
- **WHEN** strategy is `allow-rename`, an unclaimed list `L` named "Photography" exists, and no analyzed repo currently in `L` was categorized as "Machine Learning"
- **THEN** the system SHALL NOT emit a `rename-list` targeting `L` for category "Machine Learning", and the `create-list` suggestion for "Machine Learning" SHALL be preserved

#### Scenario: Unclaimed list passes eligibility but a later category also has membership evidence — first match wins
- **WHEN** strategy is `allow-rename`, unclaimed list `L` has membership evidence for category `C1` but not `C2`, and `C1` is processed before `C2`
- **THEN** `L` SHALL be consumed by `C1`'s rename and SHALL NOT be available for `C2`

#### Scenario: Multiple unclaimed lists, first lacks evidence, second has it — second is used
- **WHEN** strategy is `allow-rename`, unclaimed lists `L1` and `L2` exist in that order, `L1` has no membership evidence for category `C`, and `L2` does
- **THEN** the system SHALL skip `L1`, consume `L2` for the rename of `C`, and emit `rename-list` for `L2`

#### Scenario: `recreate` strategy is unaffected
- **WHEN** strategy is `recreate`
- **THEN** the system SHALL NOT emit any `rename-list` suggestions regardless of membership evidence, because the `allow-rename` block does not execute in `recreate` mode
