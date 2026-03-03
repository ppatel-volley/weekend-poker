# Project Configuration — Weekend Casino

> Project-specific configuration for the AI Agent Guidelines.
> Referenced by [`AGENTS.md`](./AGENTS.md).

---

## Project Commands

```bash
# Run all unit tests
pnpm test -- --run

# Run specific package tests (monorepo)
pnpm --filter @weekend-casino/shared test
pnpm --filter @weekend-casino/server test
pnpm --filter @weekend-casino/display test
pnpm --filter @weekend-casino/controller test

# Run Playwright E2E tests (requires dev servers running)
# First-time setup: install browser binaries with `pnpm exec playwright install`
pnpm test:e2e

# Type checking
pnpm typecheck

# Production build
pnpm build

# Development mode (all 3 apps)
pnpm dev

# Individual dev servers
pnpm dev:server
pnpm dev:display
pnpm dev:controller
```

---

## Test Locations

| Path | Purpose |
|------|---------|
| `packages/shared/src/__tests__/` | Shared types, constants, and utilities |
| `apps/server/src/__tests__/` | Server reducers, thunks, phases, voice |
| `apps/server/src/poker-engine/__tests__/` | Hold'em hand evaluation, betting, positions |
| `apps/server/src/draw-engine/__tests__/` | 5-Card Draw hand evaluation, discard mechanics |
| `apps/server/src/tcp-engine/__tests__/` | Three Card Poker hand evaluation, payouts |
| `apps/server/src/blackjack-engine/__tests__/` | Blackjack hand evaluation, shoe, dealer, payouts |
| `apps/server/src/bot-engine/__tests__/` | Bot personalities, rules engine, Claude engine, manager |
| `apps/display/src/__tests__/` | Display components and hooks |
| `apps/controller/src/__tests__/` | Controller components, voice, and hooks |
| `e2e/` | Playwright E2E tests |

---

## Keyword Triggers & Task Categories

| Category | Keywords | Learnings |
|----------|----------|-----------|
| Backwards Compatibility | export, import, rename, alias, re-export | 003 |
| State Shape | CasinoGameState, flat state, sub-object, D-002 | 003 |
| Session Stats | SessionStats, createSessionStats, poker vs casino | 003 |
| Game Logic | hand evaluator, payout, phase transition, endIf | — |
| Voice Pipeline | voice, intent, Deepgram, transcript, STT | — |
| Bot System | bot, Claude, personality, rules engine | — |
| Wallet | wallet, chips, balance, rebuy, D-005 | — |
| Type Integration | shared type, required field, CasinoGameState, hook generics, typecheck, build failure | 007 |
| Multi-Agent Merge | worktree, parallel agent, merge, integration | 007 |

---

## Commit Guidelines

Use conventional commits. Keep the subject line under 72 chars, imperative mood. Body is optional — use it only when the "why" isn't obvious from the subject.

**STRICT: No AI attribution footers.** NEVER add `Co-Authored-By: Claude`, `Generated with Claude Code`, `🤖 Generated with...`, or any similar AI-generated attribution to commits, PR descriptions, or any other output. These lines must never appear anywhere. Note: Claude Code adds these by default — you must actively suppress them.

---

## GitHub Gists

Always create **private/secret** gists by default. Never use `--public` unless the user explicitly asks for a public gist.

---

## Dependencies

- **Prefer existing dependencies** over adding new ones. Check if the project already has a library that covers the need.
- **Evaluate before adding**: Is it actively maintained? Any known vulnerabilities? What's the bundle size impact?
- **Always commit lockfile changes** — `pnpm-lock.yaml` must stay in sync
- **Never update dependencies unless asked** — even "minor" updates can break things
- **Pin versions** for critical dependencies; use ranges only for non-critical dev tools

---

## Testing Review Agents

**These agents MUST be spawned whenever testing is taking place** — unit tests, E2E tests, or any verification pass. They are not optional for test phases.

### Playtester Agent

**When to spawn:** After any milestone where a playable build exists (i.e., `pnpm dev` runs and games are playable). Spawn during E2E test runs and after completing each game implementation.

**Role:** A casual player (not a developer) who reviews the game from a user perspective. Evaluates fun, clarity, pacing, and engagement.

**Required output:**
- **Star rating (1-5)** per game for: Fun, Clarity, Pacing, Voice UX, Overall
- **Love it:** Things that feel natural and would delight a player
- **Confused:** Things a casual player wouldn't understand
- **Frustrated:** Things that would annoy or slow down play
- **Missing:** Features or feedback the player would expect
- **Suggestions:** Quick wins to improve the experience

**Feedback loop:** Playtester feedback goes to the **Product Manager agent**, who critically evaluates it against the PRD/roadmap and proposes design adaptations. Not every piece of feedback becomes a change — the PM filters signal from noise.

### QA Engineer Agent

**When to spawn:** During Playwright E2E test runs, after merging any game implementation, and before any release milestone.

**Role:** Senior QA engineer performing systematic quality audits. Hunts edge cases, race conditions, state consistency issues, and wallet integrity problems.

**Required output per finding:**
- **Category:** BUG / RISK / GAP / QUALITY
- **Severity:** Critical / High / Medium / Low
- **File and line number** (when applicable)
- **Reproduction steps**
- **Expected vs actual behaviour**

**Systematic checks:**
1. Boundary conditions (min/max values, empty arrays, null states)
2. State consistency (can the game reach an invalid state?)
3. Wallet integrity (are chips ever created or destroyed?)
4. Phase transitions (can we get stuck in a phase?)
5. Disconnection handling (what happens if a player drops mid-game?)
6. Voice pipeline (wrong phase, empty transcript, duplicate commands)
7. Bot system (illegal actions, timeout handling, wallet parity)

### Product Manager Agent

**When to spawn:** After playtester feedback is received. Reviews feedback critically against PRD and canonical decisions.

**Role:** Evaluates playtester feedback and decides what to act on. Not all feedback is actionable — the PM distinguishes between:
- **Must fix:** Breaks core experience or contradicts PRD
- **Should fix:** Clear improvement, low effort
- **Nice to have:** Good idea, defer to next sprint
- **Won't fix:** Contradicts design intent or canonical decisions

**Required output:**
- Prioritised list of changes with rationale
- Which canonical decisions or PRD sections support/reject each change
- Estimated effort (S/M/L) per change

---

## Learnings System

Current count: **3+ documented learnings**

See [`learnings/INDEX.md`](./learnings/INDEX.md) for the complete categorised list.

### When to Add a Learning

- You make a mistake that could have been prevented
- You discover a non-obvious gotcha in the codebase
- You find a pattern that repeatedly causes issues
- The user points out an error in your approach

### Learning Document Format

File naming: `001-topic.md`, `002-topic.md`, etc.

Each learning should include:
- **Title**: Learning XXX: [Title]
- **Date/Category/Severity** (Critical/High/Medium/Low)
- **The Mistake**: What went wrong
- **Why This Is Wrong**: Explanation
- **The Correct Process**: Step-by-step correct approach
- **Red Flags to Watch For**: Warning signs
- **Prevention**: How to avoid this in the future
