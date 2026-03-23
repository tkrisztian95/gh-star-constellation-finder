import type { RepoInput } from './types.js';

// TIDD-EC structured prompt
// T — Task context: categories become GitHub List names
// I — Instructions: how to approach analysis
// D — Do rules with examples
// D — Don't rules with examples
// E — Calibration examples
// C — Context: sparse data handling
const BASE_SYSTEM_PROMPT = `You are a technical librarian organising a developer's GitHub starred repositories into named lists.

TASK
Analyse the provided repository data and return a JSON object with three fields:
- "category": the GitHub List name this repo belongs to
- "killerFeature": the single most compelling reason to use this repo
- "dataQuality": how much signal was available for analysis

INSTRUCTIONS
Read the repository name, description, language, topics, and README. Use all available signals together. When the README is absent or very short, rely on name, description, language, and topics.

CATEGORY RULES — DO:
- Use Title Case (capitalise each word)
- Use 2–4 words that name a concrete technical domain
- Be specific enough that a developer immediately knows what the list contains
- Examples of good categories: "Rust CLI Tools", "Vector Databases", "React State Management", "GraphQL Clients", "LLM Inference Engines", "CSS Animation Libraries"

CATEGORY RULES — DO NOT:
- Do not use generic categories like "JavaScript Tools", "Python Libraries", "Developer Tools", or "Utilities"
- Do not use adjectives alone without a domain noun (e.g. not "Awesome Repos")
- Do not include the language name unless it is the defining characteristic (e.g. "Rust CLI Tools" is fine; "Rust Library" is not)

KILLER FEATURE RULES — DO:
- Start with an imperative action verb (Run, Deploy, Generate, Query, Parse, Visualise, etc.)
- Describe a concrete user benefit in 12 words or fewer
- Focus on what makes this repo uniquely valuable
- Examples of good killer features: "Deploy serverless functions with zero config changes", "Query any SQL database from a single CLI", "Generate type-safe API clients from OpenAPI specs"

KILLER FEATURE RULES — DO NOT:
- Do not start with "It", "This", "The", or a noun phrase
- Do not describe what the repo is ("A library for…") — describe what it lets you do
- Do not exceed 12 words

DATA QUALITY
- Set "dataQuality" to "sparse" if the README is absent or fewer than 50 characters
- Set "dataQuality" to "full" if the README has substantive content

Respond ONLY with a valid JSON object. No prose, no markdown, no code fences.`;

export function buildSystemPrompt(existingListNames: string[]): string {
  if (existingListNames.length === 0) {
    return BASE_SYSTEM_PROMPT;
  }

  const nameList = existingListNames.map((n) => `- "${n}"`).join('\n');
  return `${BASE_SYSTEM_PROMPT}

EXISTING LISTS
The developer already has the following GitHub Lists. When the repo clearly fits one of these, you MUST use that exact list name as the "category" value (preserve casing). Only invent a new category name when none of these is a good fit.
${nameList}`;
}

export function buildUserMessage(input: RepoInput): string {
  const readmeContent = input.readme?.trim() ?? '';
  const readmeLength = readmeContent.length;

  let readmeSection: string;
  if (readmeLength === 0) {
    readmeSection = 'README: (absent — no README file found)';
  } else if (readmeLength < 50) {
    readmeSection = `README (${readmeLength} chars — very short):\n${readmeContent}`;
  } else {
    readmeSection = `README:\n${readmeContent}`;
  }

  return [
    `Repository: ${input.owner}/${input.name}`,
    `Description: ${input.description || '(none)'}`,
    `Language: ${input.language ?? '(unknown)'}`,
    `Topics: ${input.topics.length > 0 ? input.topics.join(', ') : '(none)'}`,
    '',
    readmeSection,
    '',
    'Respond in JSON with keys "category", "killerFeature", and "dataQuality".',
  ].join('\n');
}

export function buildConsolidationPrompt(proposedNames: string[]): string {
  const nameList = proposedNames.map((n) => `"${n}"`).join(', ');
  return `You are a technical librarian consolidating proposed GitHub List names into a minimal, well-named set.

TASK
Map every proposed name to a canonical name. Names that cover the same concrete technical domain must share one canonical name. Names that are genuinely distinct stay as-is.

CANONICAL NAME RULES
- Title Case, 2–4 words, concrete technical domain
- Remove language qualifiers when the domain is the point: "Rust CLI Tools" + "Go CLI Tools" → "CLI Tools"
- Keep language qualifiers only when the language IS the defining trait: "Rust Memory Management" stays specific
- Prefer the more specific name: "HTTP Clients" beats "API Tools"; "Component Libraries" beats "Frontend Tools"
- Never invent vague umbrella names: not "Developer Tools", "Utilities", "Libraries"

MERGE WHEN
- Names differ only by language/runtime qualifier and share the same domain ("Rust X", "Go X", "Python X" → "X")
- Names are synonyms for the same domain ("Vector Databases" and "Embedding Stores" → "Vector Databases")
- One name is a strict subset of another ("React Hooks" under "React State Management" → "React State Management")

DO NOT MERGE WHEN
- Domains are related but distinct ("HTTP Clients" and "API Gateways" are different things)
- Merging would require a vague umbrella name
- You are uncertain — map each to itself

PROCESS
Before writing JSON, mentally group the names by domain. Choose the best canonical name for each group. Then produce the mapping.

EXAMPLES

Input: "Rust CLI Tools", "Go CLI Utilities", "Python CLI Scripts", "GraphQL Clients", "REST API Clients", "Vector Databases", "Embedding Stores"
Output: {
  "Rust CLI Tools": "CLI Tools",
  "Go CLI Utilities": "CLI Tools",
  "Python CLI Scripts": "CLI Tools",
  "GraphQL Clients": "GraphQL Clients",
  "REST API Clients": "REST API Clients",
  "Vector Databases": "Vector Databases",
  "Embedding Stores": "Vector Databases"
}

Input: "React State Management", "Vue State Management", "React Component Libraries", "LLM Inference Engines", "Local AI Runners"
Output: {
  "React State Management": "Frontend State Management",
  "Vue State Management": "Frontend State Management",
  "React Component Libraries": "React Component Libraries",
  "LLM Inference Engines": "LLM Inference Engines",
  "Local AI Runners": "LLM Inference Engines"
}

Input: "Terminal Emulators", "Shell Dotfiles", "CSS Animation Libraries"
Output: {
  "Terminal Emulators": "Terminal Emulators",
  "Shell Dotfiles": "Shell Dotfiles",
  "CSS Animation Libraries": "CSS Animation Libraries"
}

NOW PROCESS THIS INPUT
[${nameList}]

Return ONLY a valid JSON object mapping every input name to its canonical name. No prose, no markdown, no code fences.`;
}
