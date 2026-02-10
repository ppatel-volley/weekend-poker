# Project Configuration

> This file contains project-specific configuration for the AI Agent Guidelines.
> It is referenced by the main `AGENTS.md`.
>
> **Template**: Replace the placeholder values below with your project's actual commands, paths, and keywords.

---

## Project Commands

> **Customize these for your project's package manager and scripts.**

```bash
# Run all tests
pnpm test -- --run

# Run specific package tests (monorepo example)
pnpm --filter @yourproject/shared test
pnpm --filter @yourproject/server test

# Type checking
pnpm typecheck

# Production build
pnpm build

# Development mode
pnpm dev
```

---

## Test Locations

> **List your project's test directories so the agent knows where to find and add tests.**

<test-locations>
  <!-- Replace with your actual test paths -->
  <location path="packages/shared/src/__tests__/" purpose="Shared types and utilities" />
  <location path="apps/server/src/__tests__/" purpose="Server logic and API handlers" />
  <location path="apps/client/src/__tests__/" purpose="Client components and hooks" />
</test-locations>

---

## Existing Test Files

> **List key test files to help the agent understand what's already covered.**

<test-files>
  <!-- Replace with your actual test files -->
  <file name="example.test.ts" purpose="Example unit tests" />
  <file name="example.integration.test.ts" purpose="Example integration tests" />
</test-files>

---

## Keyword Triggers

> **Define keywords that should prompt the agent to check specific learnings before proceeding.**
> Map task keywords to learning document numbers from your `learnings/` folder.
> See AGENTS.md Appendix C for how to create learnings.

<keyword-triggers>
  <!-- Replace with your project's domain keywords and learning references -->
  <trigger keywords="auth, login, session, token" learnings="001, 002" />
  <trigger keywords="database, migration, schema" learnings="003" />
  <trigger keywords="api, endpoint, route" learnings="004, 005" />
  <trigger keywords="test, spec, expect" learnings="006" />
</keyword-triggers>

---

## Task Type Categories

> **Quick reference for which learnings to check based on task type.**

<task-learnings>
  <!-- Replace with your project's task types -->
  <category task="Authentication" learnings="001, 002" />
  <category task="Database" learnings="003" />
  <category task="API Development" learnings="004, 005" />
  <category task="Testing" learnings="006" />
</task-learnings>

---

## Learnings Summary

> **Update this count as you document learnings.**

Current count: **0 documented learnings**

See [`learnings/INDEX.md`](./learnings/INDEX.md) for the complete categorized list with summaries.

> **Getting started**: Create a `learnings/` directory with an `INDEX.md` inside it.
> Add learnings as you discover project-specific gotchas — see AGENTS.md Appendix C for the format.

---

## Verification Block (Project-Specific)

> **Customize the commands in this block to match your project.**

```
---
**Verification**
- Learnings checked: [LIST or "None applicable - reason"]
- Tests: `pnpm test -- --run` [PASSED/FAILED] ([X] tests)
- Types: `pnpm typecheck` [PASSED/NOT RUN]
- Build: `pnpm build` [PASSED/NOT RUN]
- New tests added: [YES/NO]
- Confidence: [X.X]
```

---

## Commands Cheat Sheet

> **Quick reference — replace with your most-used commands.**

```bash
pnpm test -- --run    # Run all tests
pnpm typecheck        # Type check
pnpm build            # Production build
pnpm dev              # Development mode
```
