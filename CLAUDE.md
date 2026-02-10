# AI Agent Instructions

> This file is automatically read by **Claude Code** at startup.
> For other tools, see the compatibility table below.

## Tool Compatibility

| Tool | Auto-read file | Setup |
|------|---------------|-------|
| Claude Code | `CLAUDE.md` (this file) | Automatic — no setup needed |
| Cursor | `.cursorrules` | Included in this repo (mirrors this file) |
| Windsurf | `.windsurfrules` | Copy `.cursorrules` to `.windsurfrules` |

## Instructions

Read and follow the guidelines in these files before starting any task:

1. **[AGENTS.md](./AGENTS.md)** — Core behavioral guidelines, verification requirements, and complexity triggers *(start here — first 3 sections are mandatory)*
2. **[AGENTS-PROJECT.md](./AGENTS-PROJECT.md)** — Project-specific commands, test locations, and keyword triggers
3. **[AGENTS-REACT-TS.md](./AGENTS-REACT-TS.md)** — Language and framework patterns (swap this file for your stack)
4. **[AGENTS-RLM.md](./AGENTS-RLM.md)** — Large context handling patterns (>100K tokens)

These files contain mandatory requirements for code changes, testing, and verification. Read the first three sections of AGENTS.md completely before writing any code.
