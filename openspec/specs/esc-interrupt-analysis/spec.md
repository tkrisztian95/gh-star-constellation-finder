### Requirement: ESC keypress during analysis phase signals an interrupt
During the `analyzing` phase the application SHALL listen for an ESC keypress. When ESC is received the application SHALL stop dispatching new analysis requests and transition to the `interrupt-confirm` phase. In-flight analysis requests that were already dispatched SHALL be allowed to complete.

#### Scenario: ESC pressed while analysis is in progress
- **WHEN** the app is in the `analyzing` phase and the user presses ESC
- **THEN** no further analysis requests are dispatched, any currently in-flight requests complete, and the phase transitions to `interrupt-confirm` showing the count of already-analyzed repos and the total

#### Scenario: ESC pressed before any repos have been analyzed
- **WHEN** the app is in the `analyzing` phase, zero repos have been analyzed, and the user presses ESC
- **THEN** the phase transitions to `interrupt-confirm` with `analyzedCount = 0`

#### Scenario: ESC not pressed — analysis completes normally
- **WHEN** the app is in the `analyzing` phase and no ESC is pressed
- **THEN** all repos are analyzed and the flow continues to consolidation exactly as before

### Requirement: LoadingScreen displays ESC hint during analyzing phase
The `LoadingScreen` component SHALL display a dimmed hint line `"Press ESC to stop and continue with analyzed repos"` when `phase === "analyzing"`. This hint SHALL NOT appear during the `fetching` phase.

#### Scenario: Hint visible during analyzing
- **WHEN** `LoadingScreen` renders with `phase="analyzing"`
- **THEN** the ESC hint text is present in the output

#### Scenario: Hint absent during fetching
- **WHEN** `LoadingScreen` renders with `phase="fetching"`
- **THEN** the ESC hint text is not present in the output

### Requirement: Interrupt-confirm screen asks user whether to continue with partial results
The `InterruptConfirmScreen` component SHALL display the number of analyzed repos, the total repo count, and offer a yes/no choice: continue with partial results or exit.

#### Scenario: User selects yes — continue with partial results
- **WHEN** `InterruptConfirmScreen` is shown and the user selects "Yes, continue"
- **THEN** the `onContinue` callback is invoked and the post-analysis workflow (consolidation → review → summary → apply) proceeds using only the already-analyzed repos

#### Scenario: User selects no — exit
- **WHEN** `InterruptConfirmScreen` is shown and the user selects "No, exit"
- **THEN** the application exits cleanly

#### Scenario: Zero analyzed repos and user selects yes
- **WHEN** `InterruptConfirmScreen` is shown with `analyzedCount = 0` and the user selects "Yes, continue"
- **THEN** the application shows an info message "No repos were analyzed — nothing to organize" and exits instead of entering the review flow

### Requirement: Interrupt-confirm screen offers option to save partial analysis results
The `InterruptConfirmScreen` SHALL always present three options when `analyzedCount > 0`:
1. Continue with partial results (proceed to organize)
2. Save partial results to file (write JSON then exit)
3. Exit without saving

When the user selects option 2, the application SHALL transition to the existing `save-prompt` phase to collect a file path, write the partial analysis JSON (same format as `--analyze-only` output), and then exit. The save option is available regardless of whether the user intends to continue organizing.

#### Scenario: User selects save partial results after choosing not to continue
- **WHEN** `InterruptConfirmScreen` is shown with `analyzedCount > 0` and the user selects "Save partial results to file"
- **THEN** the app transitions to the `save-prompt` phase; after the user provides a path the partial analysis JSON is written to that path and the app exits

#### Scenario: User can continue AND save is available
- **WHEN** `InterruptConfirmScreen` is shown with `analyzedCount > 0`
- **THEN** all three options (continue, save, exit) are shown

#### Scenario: Save option not available when zero repos analyzed
- **WHEN** `InterruptConfirmScreen` is shown with `analyzedCount = 0`
- **THEN** only the exit option is shown (nothing to save or continue with)

### Requirement: Post-analysis workflow is unchanged when continuing with partial results
When the user confirms to continue after an ESC interrupt, the consolidation, review, summary, and apply phases SHALL execute identically to a normal full-analysis run, using the partial `analyzedRepos` array as input.

#### Scenario: Consolidation runs on partial analyzed repos
- **WHEN** the user confirms to continue after ESC interrupt with N analyzed repos (N > 0)
- **THEN** `consolidateCategories` is called with the categories derived from those N repos, and the review phase presents suggestions based only on those repos
