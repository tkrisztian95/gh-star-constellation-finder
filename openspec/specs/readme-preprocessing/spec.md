# readme-preprocessing Specification

## Purpose
TBD - created by archiving change smarter-readme-preprocessing. Update Purpose after archive.
## Requirements
### Requirement: Strip HTML comments from README content
The system SHALL remove all HTML comment blocks from a README string before truncation.

#### Scenario: HTML comment removed
- **WHEN** a README contains `<!-- some comment -->`
- **THEN** the preprocessed output SHALL NOT contain that comment block

#### Scenario: Multi-line HTML comment removed
- **WHEN** a README contains a multi-line HTML comment spanning several lines
- **THEN** the preprocessed output SHALL NOT contain any part of that comment

### Requirement: Strip markdown badges from README content
The system SHALL remove markdown-style badge links of the form `[![alt](img-url)](link-url)` from a README string before truncation.

#### Scenario: Build-status badge removed
- **WHEN** a README contains a markdown badge like `[![Build Status](https://travis-ci.org/...)](https://travis-ci.org/...)`
- **THEN** the preprocessed output SHALL NOT contain that badge

### Requirement: Strip HTML badge anchors from README content
The system SHALL remove HTML anchor elements wrapping an `<img>` tag (common badge pattern) from a README string before truncation.

#### Scenario: shields.io HTML badge removed
- **WHEN** a README contains `<a href="..."><img src="https://img.shields.io/..." /></a>`
- **THEN** the preprocessed output SHALL NOT contain that anchor or image element

### Requirement: Strip inline markdown images from README content
The system SHALL remove standalone inline images (`![alt](url)`) that are not part of a badge link from a README string before truncation.

#### Scenario: Screenshot image removed
- **WHEN** a README contains `![screenshot](docs/screenshot.png)`
- **THEN** the preprocessed output SHALL NOT contain that image tag

### Requirement: Strip Table of Contents sections from README content
The system SHALL remove a Table of Contents section — identified by a heading matching "Table of Contents", "TOC", or "Contents" — along with its list items, up to the next section heading.

#### Scenario: TOC section removed
- **WHEN** a README contains `## Table of Contents` followed by a list and then `## Installation`
- **THEN** the preprocessed output SHALL NOT contain the TOC heading or its list items
- **THEN** the preprocessed output SHALL retain the `## Installation` section

#### Scenario: No TOC present
- **WHEN** a README contains no TOC heading
- **THEN** the preprocessing SHALL leave the rest of the content unaffected

### Requirement: Preserve leading description content
After noise stripping, the system SHALL retain the first 1500 characters of the cleaned README text, which typically contains the project title, tagline, and primary description.

#### Scenario: Short README fits entirely
- **WHEN** the cleaned README is shorter than 1500 characters
- **THEN** the full cleaned content SHALL be included in the output

#### Scenario: Long README leading content preserved
- **WHEN** the cleaned README exceeds 1500 characters
- **THEN** the first 1500 characters SHALL be included in the output

### Requirement: Append content from key feature/about sections
After the leading description, the system SHALL scan the cleaned README for the first section whose heading matches "Features", "Key Features", "About", or "What is it?" (case-insensitive) and append up to 1500 characters of that section's content.

#### Scenario: Features section appended
- **WHEN** a README contains a `## Features` section after a long description
- **THEN** the preprocessed output SHALL include content from the Features section even if it falls beyond the initial 1500-character prefix

#### Scenario: No matching section present
- **WHEN** a README contains no Features, About, or similar heading
- **THEN** the preprocessing SHALL produce output using only the leading description content

### Requirement: Apply overall length cap after preprocessing
After assembling the preprocessed content, the system SHALL cap the result at `README_MAX_LENGTH` characters. If the assembled content exceeds this cap, the output SHALL end with `... [truncated]`.

#### Scenario: Content within cap
- **WHEN** the assembled preprocessed content is shorter than `README_MAX_LENGTH`
- **THEN** the output SHALL contain the full assembled content with no truncation marker

#### Scenario: Content exceeds cap
- **WHEN** the assembled preprocessed content exceeds `README_MAX_LENGTH`
- **THEN** the output SHALL be sliced at `README_MAX_LENGTH` and appended with `... [truncated]`

