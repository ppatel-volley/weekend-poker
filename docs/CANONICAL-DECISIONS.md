# Weekend Casino — Canonical Decision Register

> **Status:** Final
> **Authority:** This document is the single source of truth for all major product, technical, and design decisions. It overrides any conflicting language in any other document.
> **Last Aligned:** 2026-02-28
> **Canonical Decisions:** This is the canonical decisions register.
> **Supersedes:** All prior conflicting language across the document set.

---

## Purpose

This register exists because the Weekend Casino document set contains multiple docs written by different authors at different times. Cross-doc contradictions were identified by external review (`docs/codex-feedback.md`, 2026-02-27) and deemed high-risk for misexecution. Every decision below resolves a specific conflict or ambiguity. If any other document contradicts a decision in this register, **this register wins**.

---

## Governance Hierarchy

When documents conflict, defer to whichever is higher in this list:

1. **`docs/CANONICAL-DECISIONS.md`** — this file (overrides everything)
2. **`docs/CASINO-V2-ROADMAP-FINAL.md`** — release scope and timing authority
3. **`docs/CASINO-GAME-DESIGN.md`** — technical design authority
4. **`docs/CASINO-PRD.md`** — product requirements authority
5. **Everything else** — reference / proposal / historical

All six review documents (`REVIEW-*.md`, `FINAL-REVIEW-*.md`) are marked **Superseded** and retained for historical reference only.

### Authority Matrix

| Document | Authoritative For | NOT Authoritative For | On Conflict |
|----------|------------------|----------------------|-------------|
| `CANONICAL-DECISIONS.md` | All registered decisions (D-001–D-019); governance hierarchy | Implementation detail; UX copy | Wins against everything |
| `CASINO-V2-ROADMAP-FINAL.md` | Release scope, timing, phasing; feature-to-release assignment | Game mechanics; technical architecture | Wins against all below |
| `CASINO-GAME-DESIGN.md` | Game rules, state schemas, phase definitions, UI specs | Release timing; product priorities | Wins against PRD |
| `CASINO-PRD.md` | v1 product requirements, user stories, acceptance criteria | Release timing (defers to roadmap) | Baseline; defers to all above |
| `CASINO-V2-PRD.md` | v2 product requirements, feature specs, acceptance criteria | Release timing (defers to roadmap) | Defers to roadmap + canonical |
| `CASINO-TDD-*.md` | Technical architecture, implementation design, interfaces | Product scope; release timing | Conforms to all above |
| Legacy `PRD.md`, `TDD-*.md` | Nothing (superseded) | Everything | Do not cite as authority |

---

## Decision Register

### D-001: Single GameRuleset with Phase Namespaces

| Field | Value |
|-------|-------|
| **ID** | D-001 |
| **Date** | 2026-02-27 |
| **Decision** | The multi-game architecture uses a single expanded `GameRuleset` with phase namespaces rather than separate ruleset instances per game. |
| **Owner** | Senior Game Designer / Principal Engineer |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 3, `CASINO-PRD.md` Section 27 |
| **Supersedes** | Any language suggesting separate rulesets or session-per-game model. |

---

### D-002: CasinoGameState — Flat Base with Optional Sub-Objects

| Field | Value |
|-------|-------|
| **ID** | D-002 |
| **Date** | 2026-02-27 |
| **Decision** | `CasinoGameState` is a flat union type with optional game-specific sub-objects; it does NOT extend or inherit from `PokerGameState`. |
| **Owner** | Principal Engineer (review item C6) |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 3 (State Shape Strategy) |
| **Supersedes** | Any inheritance-based state hierarchy or language suggesting `CasinoGameState extends PokerGameState`. |

---

### D-003: Phase Naming Convention — Underscore Prefix, UPPER_SNAKE_CASE

| Field | Value |
|-------|-------|
| **ID** | D-003 |
| **Date** | 2026-02-27 |
| **Decision** | All game phases use UPPER_SNAKE_CASE with a game-specific underscore prefix (e.g., `DRAW_`, `BJ_`, `BJC_`). Hold'em phases remain unprefixed for backwards compatibility. |
| **Owner** | Senior Game Designer |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 3, `CASINO-PRD.md` Sections 11/17/20 |
| **Supersedes** | Any alternative naming convention for phases. |

---

### D-004: CasinoGame Enum — snake_case Values

| Field | Value |
|-------|-------|
| **ID** | D-004 |
| **Date** | 2026-02-27 |
| **Decision** | The `CasinoGame` type uses snake_case string literal values: `'holdem'`, `'five_card_draw'`, `'blackjack_classic'`, `'blackjack_competitive'`. |
| **Owner** | Senior Game Designer |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 2, `CASINO-PRD.md` Section 7 |
| **Supersedes** | Any PascalCase, camelCase, or other casing for game identifiers. |

---

### D-005: Starting Wallet — 10,000 Chips

| Field | Value |
|-------|-------|
| **ID** | D-005 |
| **Date** | 2026-02-27 |
| **Decision** | Every player starts each session with 10,000 chips in a shared wallet that persists across games within the session. |
| **Owner** | Product Management |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 4, `CASINO-PRD.md` Section 24 |
| **Supersedes** | Any alternative starting chip amount. |

---

### D-006: Blackjack Max Bet — 500 Chips

| Field | Value |
|-------|-------|
| **ID** | D-006 |
| **Date** | 2026-02-27 |
| **Decision** | The maximum bet per hand in Blackjack (both Classic and Competitive modes) is 500 chips. |
| **Owner** | Senior Game Designer |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 10, `CASINO-PRD.md` Section 16 |
| **Supersedes** | Any alternative max bet for Blackjack. |

---

### D-007: Competitive Blackjack — Sequential Turns, No Splits (v1)

| Field | Value |
|-------|-------|
| **ID** | D-007 |
| **Date** | 2026-02-27 |
| **Decision** | Competitive Blackjack in v1 uses sequential player turns (not simultaneous). Splitting is not available. Simultaneous play is deferred to v2. |
| **Owner** | Principal Engineer (review item M3) |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 15-16, `CASINO-PRD.md` Section 19-20 |
| **Supersedes** | Any language suggesting simultaneous competitive Blackjack turns in v1, or split availability in competitive mode. |

---

### D-008: Game Switching — Host-Only (v1), Vote-Based (v2)

| Field | Value |
|-------|-------|
| **ID** | D-008 |
| **Date** | 2026-02-27 |
| **Decision** | In v1, only the host can initiate a game switch between rounds. In v2, any player can propose a game change via a vote-based mechanism. |
| **Owner** | Product Management |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 2, `CASINO-PRD.md` Section 7 |
| **Supersedes** | Any language suggesting vote-based game switching in v1. |

---

### D-009: Soft 17 — Dealer Stands by Default, Configurable per Difficulty

| Field | Value |
|-------|-------|
| **ID** | D-009 |
| **Date** | 2026-02-27 |
| **Decision** | The dealer stands on soft 17 by default. This is configurable per `BlackjackDifficulty` setting (e.g., hard difficulty may hit on soft 17). |
| **Owner** | Senior Game Designer |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 10, `CASINO-PRD.md` Section 16 |
| **Supersedes** | Any unconditional "hit on soft 17" or "stand on soft 17" language without the configurability clause. |

---

### D-010: Blackjack Dealer Characters

| Field | Value |
|-------|-------|
| **ID** | D-010 |
| **Date** | 2026-02-27 |
| **Decision** | Blackjack has three dedicated dealer characters: Ace Malone (suave veteran), Scarlett Vega (sharp-witted), and Chip Dubois (jovial Cajun). These are separate from the poker dealers (Vincent, Maya, Remy, Jade). |
| **Owner** | Product Management / Game Design |
| **Applies to** | `CASINO-PRD.md` Section 23, `CASINO-GAME-DESIGN.md` Section 17 |
| **Supersedes** | Any alternative dealer character roster for Blackjack. |

---

### D-011: Video State — Server-Authoritative with Scheduler Timeouts

| Field | Value |
|-------|-------|
| **ID** | D-011 |
| **Date** | 2026-02-27 |
| **Decision** | Video playback state is server-authoritative. The server-side scheduled thunk (`VIDEO_HARD_TIMEOUT`) is the primary timeout mechanism. The Display's `completeVideo` dispatch is an optimisation, not the authority. `endIf` never calls `Date.now()`. |
| **Owner** | Principal Engineer (review items V-CRITICAL-1/2/3) |
| **Applies to** | `CASINO-GAME-DESIGN.md` Sections 21/27, `CASINO-PRD.md` Section 36 |
| **Supersedes** | Any language where `endIf` uses `Date.now()` or client dispatch is the primary video completion mechanism. |

---

### D-012: Video Asset Count — 51 (Canonical)

| Field | Value |
|-------|-------|
| **ID** | D-012 |
| **Date** | 2026-02-27 |
| **Decision** | The canonical video asset count is 51 (7 shared + 9 Hold'em + 10 5-Card Draw + 16 Blackjack Classic + 9 Blackjack Competitive). All current-state requirements and specifications must use 51. Historical context notes (e.g., "v1 had 77 assets, aligned to 51 in v2") are permitted in archived/cross-reference sections but must not be used as current requirements. |
| **Owner** | Senior Game Designer (review item V-MINOR-1) |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 27, `CASINO-VIDEO-ASSETS.md`, `CASINO-PRD.md` Section 35 |
| **Supersedes** | Any current-state reference to 49, ~49, or 77 video assets. Historical context retained in archived sections of `CASINO-GAME-DESIGN.md` Section 28. |

---

### D-013: Video Preloading — Per-Game Lazy Loading with Eviction

| Field | Value |
|-------|-------|
| **ID** | D-013 |
| **Date** | 2026-02-27 |
| **Decision** | Video assets use per-game lazy loading with a priority queue (max 3 concurrent downloads), sprite sheets for short overlays, and graceful degradation. Bulk preloading of all videos at session start is NOT used. |
| **Owner** | Principal Engineer (review item V-MAJOR-2) |
| **Applies to** | `CASINO-GAME-DESIGN.md` Section 21, `CASINO-PRD.md` Sections 30/35/36, `CASINO-VIDEO-ASSETS.md` |
| **Supersedes** | Any language stating "pre-load all videos at session start", "all videos pre-loaded", or similar bulk preload strategies. |

---

### D-014: Game Night Scoring — Rank-Based (NOT Chip-Multiplier)

| Field | Value |
|-------|-------|
| **ID** | D-014 |
| **Date** | 2026-02-27 |
| **Decision** | Game Night Mode uses rank-based scoring (1st = 100 pts, 2nd = 70, 3rd = 45, 4th = 25 + bonus points). The chip-multiplier normalisation system is deprecated and must NOT be implemented. |
| **Owner** | PM (consolidated in `CASINO-V2-ROADMAP-FINAL.md` Decision 1) |
| **Applies to** | `CASINO-V2-RETENTION.md` Section 1, `CASINO-V2-ROADMAP-FINAL.md` Decision 1, `CASINO-V2-NEW-GAMES.md` Section 25 |
| **Supersedes** | Any chip-multiplier normalisation code, `GAME_NIGHT_NORMALISERS` constant, or `normaliseChipResult` function references. |

---

### D-015: Three Card Poker Ships in v2.0

| Field | Value |
|-------|-------|
| **ID** | D-015 |
| **Date** | 2026-02-27 |
| **Decision** | Three Card Poker (TCP) ships in v2.0 as part of the "More Casino" release. It is the simplest new game and validates multi-game expansion with low risk. |
| **Owner** | PM (consolidated in `CASINO-V2-ROADMAP-FINAL.md` Decision 5) |
| **Applies to** | `CASINO-V2-ROADMAP-FINAL.md` Section 2, `CASINO-V2-NEW-GAMES.md` |
| **Supersedes** | Any language deferring TCP to v2.1 or later. |

---

### D-016: Craps Ships in v2.1

| Field | Value |
|-------|-------|
| **ID** | D-016 |
| **Date** | 2026-02-27 |
| **Decision** | Craps ships in v2.1 alongside Game Night Mode. It is the most complex game and requires exhaustive test coverage before release. |
| **Owner** | PM / Principal Engineer (consolidated in `CASINO-V2-ROADMAP-FINAL.md` Decision 2) |
| **Applies to** | `CASINO-V2-ROADMAP-FINAL.md` Sections 2-3, `CASINO-V2-NEW-GAMES.md` |
| **Supersedes** | Any language placing Craps in v2.0. |

---

### D-017: DAU Target — Phased v2 Targets, 1M = v3

| Field | Value |
|-------|-------|
| **ID** | D-017 |
| **Date** | 2026-02-28 (updated) |
| **Decision** | v2 DAU targets are phased: **50-100K DAU at 6 months post-v2.0** (realistic milestone), scaling to **200-500K DAU across the full v2 lifecycle** (v2.0 through v2.2+ with retention systems active). The **1M DAU** target moves to **v3**, contingent on online multiplayer breaking the TV-first co-location ceiling. |
| **Owner** | PM (consolidated in `CASINO-V2-ROADMAP-FINAL.md`) |
| **Applies to** | All docs referencing DAU targets |
| **Supersedes** | Any language citing a single unphased v2 DAU number. The phased interpretation (50-100K milestone → 200-500K lifecycle) is canonical. 1M is only referenced as a v3 aspirational target. |

---

### D-018: Phone Companion Mode — P0 for v2.2

| Field | Value |
|-------|-------|
| **ID** | D-018 |
| **Date** | 2026-02-27 |
| **Decision** | Phone Companion Mode (daily bonus collection, challenge tracking, profile view, push notifications without a TV) is P0 priority and ships with v2.2, dependent on the persistence layer. |
| **Owner** | PM (consolidated in `CASINO-V2-ROADMAP-FINAL.md` Decision 3) |
| **Applies to** | `CASINO-V2-ROADMAP-FINAL.md` Sections 3-4, `CASINO-V2-RETENTION.md` |
| **Supersedes** | Any lower prioritisation of companion mode. |

---

### D-019: Persistence Layer — Starts Parallel at Week 1

| Field | Value |
|-------|-------|
| **ID** | D-019 |
| **Date** | 2026-02-27 |
| **Decision** | The persistence layer (player identity, database, profile/inventory services, VGF `IPersistence` implementation) starts architecture design immediately and runs in parallel with v2.0 and v2.1 game development. It ships as part of v2.2. |
| **Owner** | Principal Engineer / Backend Lead (consolidated in `CASINO-V2-ROADMAP-FINAL.md` Decision 4) |
| **Applies to** | `CASINO-V2-ROADMAP-FINAL.md` Sections 3-4 |
| **Supersedes** | Any language deferring persistence to after v2.0 ships or treating it as a future consideration. |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-28 | Initial register created from codex feedback review. All decisions consolidated from cross-doc alignment pass. | PM |
