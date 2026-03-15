---
# Workspace instructions for GitHub Copilot Chat
# See .github/copilot-instructions.md template and agent-customization SKILL for details
# Applies for all files by default, tune `applyTo` for subfolders if needed.

name: "Zero Base 2.0 Copilot Instructions"
description: "Project-level guidance for GitHub Copilot Chat in the Zero Base 2.0 repository. Use this to enforce architecture norms, preferred workflows, and quick command references."
applyTo: "**/*"
---

# Policies are interpreted by the agent loader; keep them short and actionable.
  coding_style:
    - "TypeScript-first (no `any` unless necessary; use explicit types)."
    - "React functional components + hooks, no class components."
    - "Use existing project structure under `src/` and `server/`.
      Keep state in `src/components` via hooks and local architecture."
  linting:
    - "Run `npm run lint` before PR. Fix all ESLint errors and warnings."
    - "Run `npm run test` and `npm run e2e` for significant UI or behavior changes."
  testing:
    - "Use `vitest` for unit tests in `src/components` and `src/services`."
    - "Use `cypress` for e2e tests under `cypress/e2e`."

# Quick commands (in scope for suggestions)
commands:
  - "npm install"
  - "npm run dev"
  - "npm run build"
  - "npm run lint"
  - "npm run test"
  - "npm run e2e"

# Known architecture and conventions (for code generation)
architecture:
  - "Frontend: React + Vite + Tailwind. UI lives in `src/` (pages, components, hooks, services)."
  - "Backend helper: minimal Node/Express + Supabase helpers under `server/src`."
  - "Supabase integration in `supabase/`; database migration scripts there."
  - "OpenAI/LLM integration may rely on `@supabase/supabase-js`, `openai` and custom helpers."
  - "No Redux. Prefer local state and context providers when needed."

# Security & data handling
security:
  - "Never commit secrets or `.env` values. Use `.env.example` as template."
  - "Prefer safe sanitization via `DOMPurify` in frontend HTML inserts."
  - "Rate-limit and auth behavior uses `express-rate-limit` / JWT (look at server implementation)."

# Code review hints
review:
  - "Provide tests for feature changes and bug fixes."
  - "Validate with Cypress for user flows that touch timer / progress / achievements."
  - "For UI copy changes, keep language in Portuguese consistent with project style."

---

# Notes
* This file is derived from `README.md`, `package.json`, and project docs to bootstrap workspace custom instructions.
* For more advanced scenario-specific helpers, consider adding `AGENTS.md` or `*.instructions.md` under `.github/instructions/` with `applyTo` globs (frontend, backend, tests).
