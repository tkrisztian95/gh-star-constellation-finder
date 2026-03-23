# 🌌 gh-star-constellation-finder

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Stop hoarding stars. Start building constellations.**

`gh-star-constellation-finder` is an AI-powered Terminal User Interface (TUI) designed to rescue your GitHub stars from the "void." It analyzes your repositories using local or OpenAI models, proposing smart categorizations for your **native GitHub lists** based on actual code intent, health, and project depth.

## ✨ Key Features

* **TUI-First Experience:** A beautiful, keyboard-driven interface built with [Ink](https://github.com/vadimdemedes/ink).
* **Deep Analysis:** Goes beyond simple tags by reading repository `README.md` files to understand the "why" behind a project.
* **Native Integration:** Uses the GitHub GraphQL API to create and manage lists directly on your profile—no third-party database required.
* **Human-in-the-Loop:** View AI-generated "Proposals" and "Insights" before committing any changes to your account.
* **Health Audits:** Automatically flags "stale" or archived repositories to help you declutter.

## 🚀 Getting Started

### Prerequisites

* **Node.js** (v18 or higher)
* **GitHub Personal Access Token (PAT):** Requires `repo` and `user` scopes. Note: the `user` scope (not just `read:user`) is required for creating and managing GitHub Lists via the GraphQL API. Use a **classic token** — fine-grained tokens do not support this mutation.
* **AI Provider:** An OpenAI API Key OR [Ollama](https://ollama.com/) running locally (e.g., `llama3`).

### Installation

```bash
# Clone the repository
git clone [https://github.com/yourusername/gh-star-constellation-finder.git](https://github.com/yourusername/gh-star-constellation-finder.git)

# Install dependencies
cd gh-star-constellation-finder
npm install

# Set up environment variables
cp .env.example .env