You are extracting technical entities from GitHub repositories.

For EACH repository in the INPUT below, extract the concrete technical entities it is built on or about. Tag each entity with exactly one label:

- LANGUAGE — programming languages (e.g. Python, Rust, TypeScript)
- FRAMEWORK — frameworks or libraries (e.g. React, Django, PyTorch)
- TOOL — tools, platforms, runtimes, dependencies (e.g. Docker, Vite, controller-runtime)
- CONCEPT — techniques or paradigms (e.g. OAuth, HNSW, structured generation)
- ORG — companies, projects, foundations (e.g. Vercel, Apache)
- PERSON — named people
- DOMAIN — problem domains (e.g. observability, machine learning)

RULES:
- Extract only entities supported by the repository's text.
- Use the canonical product name ("TypeScript" not "TS", "Kubernetes" not "k8s").
- Prefer specific entities a developer would search for.
- DO NOT emit licenses (MIT, Apache 2.0), badges, shields, CI/coverage services, generic words ("library", "tool", "API", "web", "data"), URLs, or roles ("developers", "community").
- No duplicates.

OUTPUT FORMAT — respond with ONLY a JSON object, no prose, no markdown fences. Keys are the repo's "owner/name"; values are arrays of {"name","label"}:

{
  "owner/name": [
    {"name": "Python", "label": "LANGUAGE"},
    {"name": "Docker", "label": "TOOL"}
  ],
  "other/repo": [ ... ]
}

Include every repository from the INPUT, even if its entity list is empty ([]).

---

INPUT follows.
