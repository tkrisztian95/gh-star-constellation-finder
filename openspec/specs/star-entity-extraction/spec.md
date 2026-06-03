# star-entity-extraction Specification

## Purpose
TBD - created by archiving change star-entity-extraction. Update Purpose after archive.
## Requirements
### Requirement: Analysis extracts technical entities
The analyzer SHALL return, alongside `category`/`killerFeature`/`description`, an `entities` array where each entity has a `name` (string) and a `label` from the set `LANGUAGE`, `FRAMEWORK`, `TOOL`, `CONCEPT`, `ORG`, `PERSON`, `DOMAIN`. Entities SHALL be extracted from the same prompt context the analyzer already uses (including the README when present).

#### Scenario: Entities returned for a typical repo
- **WHEN** a repo with a README mentioning its language and dependencies is analysed
- **THEN** `AnalysisResult.entities` contains those technologies tagged with appropriate labels

#### Scenario: Missing entities field never fails analysis
- **WHEN** the model response omits or malforms the `entities` field but is otherwise valid JSON
- **THEN** parsing succeeds and `entities` is `[]`

#### Scenario: Invalid entity is dropped, not thrown
- **WHEN** the response contains an entity with an unknown label or empty name
- **THEN** that entity is dropped and the remaining valid entities are returned

### Requirement: Extracted entities are filtered for noise
A deterministic filter SHALL remove non-technical noise from extracted entities: license names, badge/CI markers, and generic stopwords, plus empty or over-long names, and SHALL de-duplicate by normalized (name, label).

#### Scenario: License and badge noise removed
- **WHEN** the model emits entities like "Apache 2.0", "badge", or "CI"
- **THEN** the filter removes them from the result

#### Scenario: Duplicates collapsed
- **WHEN** the same entity appears twice with differing casing
- **THEN** only one entity remains

### Requirement: Analysis cache persists entities
The analysis cache SHALL store the `entities` array and return it on cache hits. The cache schema version SHALL be incremented; pre-existing entries without entities SHALL be dropped and re-analysed once.

#### Scenario: Entities survive a cache round-trip
- **WHEN** an analysis with entities is saved and then read back by repo id + readme hash
- **THEN** the returned `AnalysisResult.entities` equals what was saved

#### Scenario: Old-version cache is migrated
- **WHEN** a cache file at the previous schema version is opened
- **THEN** its entries are dropped and the new schema (with the entities column) is created

### Requirement: Corpus contract carries entities
The corpus contract (`corpusEntrySchema`) SHALL include the `entities` array, and `--export-corpus` SHALL emit it per entry so downstream consumers can build the constellation without a second extraction pass.

#### Scenario: Exported corpus entry includes entities
- **WHEN** `--export-corpus` writes an entry for an analysed repo
- **THEN** the entry contains an `entities` array matching the analysis result

