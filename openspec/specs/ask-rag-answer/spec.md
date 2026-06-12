# ask-rag-answer Specification

## Purpose
Grounded answer generation for `--ask`: assemble a context block from retrieved docs and produce an answer that cites repo URLs or declines when nothing is relevant. Created by archiving change headless-ask.

## Requirements
### Requirement: Answers are grounded in retrieved repos and cite URLs

The RAG answer step SHALL assemble a context block from the top-k retrieved repos' `doc` text and instruct the AI, via the `AIProvider.complete()` seam, to answer the question using ONLY those starred repos and to cite the repos it relies on by their `github.com/<owner>/<name>` URL. The AI MUST NOT be asked to use knowledge outside the provided repos.

#### Scenario: Grounded answer with citations
- **WHEN** `--ask "which of my stars are Rust CLI tools"` runs against a corpus containing Rust CLI repos
- **THEN** the answer names those repos and the citations list contains their `github.com/<owner>/<name>` URLs

### Requirement: Declines when nothing relevant is retrieved

When retrieval returns no repos, or none are relevant to the question, the answer step SHALL produce a response that says no starred repos match rather than fabricating repos or citing URLs not in the retrieved set.

#### Scenario: No relevant repos
- **WHEN** a question has no relevant repos in the corpus
- **THEN** the answer states that none of the user's stars match, and the citations list is empty

#### Scenario: Citations are a subset of retrieved repos
- **WHEN** an answer is produced
- **THEN** every cited URL corresponds to a repo that was in the retrieved top-k
