# Weekend Casino v2 — Final Consolidated Roadmap

> **Status:** Final
> **Authority:** Release scope and timing for v2.x. Authoritative for what ships when and in which release.
> **Last Aligned:** 2026-02-28
> **Canonical Decisions:** See `docs/CANONICAL-DECISIONS.md`
> **Supersedes:** All prior v2 proposals and reviews | **Superseded By:** —
>
> **Version:** 1.0
> **Date:** 2026-02-27
> **Author:** PM (consolidated from all v2 proposals and reviews)
> **Inputs:**
> - `CASINO-V2-RETENTION.md` — Retention & meta-game systems
> - `CASINO-V2-EXISTING-GAME-CHANGES.md` — Existing game improvements
> - `CASINO-V2-NEW-GAMES.md` — New games (Craps, Roulette, Three Card Poker)
> - `REVIEW-V2-PM.md` — Product-market fit review
> - `REVIEW-V2-PRINCIPAL.md` — Principal engineer technical review
> - `MARKET-RESEARCH-CASINO-GAMES.md` — Market research

---

## Executive Summary

This roadmap synthesises the v2 proposals with feedback from both the PM review and principal engineer review. The key insight from both reviews is the same: **the retention systems that drive DAU require persistent backend infrastructure that does not exist today.** This fundamentally reshapes the ship order.

**Revised v2 Scale Target:** 300-500K MAU and 50-100K DAU at ~6 months post-v2.0, with upside toward 200-500K DAU only in later stages if v2.2+ retention systems materially outperform baseline. The 1M DAU target moves to v3, contingent on online multiplayer breaking the TV-first co-location ceiling.

**Three workstreams, running in parallel:**
1. **Games** — new games and game improvements (frontend-heavy, ships first)
2. **Infrastructure** — persistence layer, player identity, companion app (backend-heavy, starts immediately, enables retention)
3. **Retention** — all meta-game systems (blocked on infrastructure, ships last)

---

## Table of Contents

1. [Critical Decisions](#1-critical-decisions)
2. [v2.0 — "More Casino" Release](#2-v20--more-casino-release)
3. [v2.1 — "Game Night" Release](#3-v21--game-night-release)
4. [v2.2 — "Come Back Tomorrow" Release](#4-v22--come-back-tomorrow-release)
5. [v2.3+ — Data-Driven Iteration](#5-v23--data-driven-iteration)
6. [Deferred to v3](#6-deferred-to-v3)
7. [Cut from v2](#7-cut-from-v2)
8. [Open Technical Issues](#8-open-technical-issues)
9. [Risk Register](#9-risk-register)
10. [Success Metrics](#10-success-metrics)

---

## 1. Critical Decisions

These decisions were made based on conflicts or gaps identified across the proposals and reviews. Each is documented here so the rationale is traceable.

### Decision 1: Game Night Scoring System

**Conflict:** `CASINO-V2-RETENTION.md` defines a rank-based system (1st = 100 pts, 2nd = 70, 3rd = 45, 4th = 25 + bonus points). `CASINO-V2-NEW-GAMES.md` defines a chip-multiplier normalisation system.

**Resolution: Use the rank-based system from the retention doc.**

Rationale (from principal engineer review RC-4):
- Simpler to explain to players ("1st place gets 100 points, 2nd gets 70...")
- Fairer across games with wildly different payout structures
- Harder to game (you can't farm points by choosing high-variance games)
- Easier to implement (no per-game normalisation constants to tune)

The chip-multiplier system from the new games doc is deprecated. The `GAME_NIGHT_NORMALISERS` constant and `normaliseChipResult` function should NOT be implemented.

**Action:** Update `CASINO-V2-NEW-GAMES.md` Section 25 to reference the retention doc's scoring system.

### Decision 2: Craps Ships in v2.1, Not v2.0

**Conflict:** PM review says Craps is "must-have for v2." Principal engineer review says Craps is the most complex game and should ship second.

**Resolution: Craps ships in v2.1 alongside Game Night Mode.**

Rationale:
- The principal engineer is right that Craps is the most complex game in the platform. The `resolveCrapsRoll` thunk handles 6+ bet types with different resolution rules per roll outcome. Come bet persistence across rounds is architecturally unique. This needs exhaustive test coverage before shipping.
- Roulette and Three Card Poker are significantly simpler. Shipping them first validates the multi-game architecture with lower risk.
- Craps ships in v2.1 (6-8 weeks after v2.0), not months later. This is a sequencing decision, not a cut.
- Craps also benefits from shipping alongside Game Night Mode — it's the highest-energy game and the ideal Game Night centrepiece.

### Decision 3: Phone Companion Mode is P0

**Conflict:** Not in the original proposals. Both PM review (Finding #2) and principal engineer review (W1) identify that daily engagement mechanics require a way for players to interact without a TV.

**Resolution: Phone Companion Mode is P0 for the infrastructure workstream. Launches with v2.2.**

The companion mode provides:
- Daily bonus collection (phone-only, no TV needed)
- Challenge progress tracking
- Profile viewing
- Crew stats (when Crews ship)
- Push notifications ("Game Night tonight at 7!")

This is the critical bridge between "weekly party app" and "daily engagement app." Without it, daily bonuses and streaks are features for a product that doesn't exist.

**Note:** This requires the persistence layer (Decision 4). It ships when persistence ships.

### Decision 4: Persistence Layer Starts Immediately, Ships With v2.2

**From principal engineer review (W1):** Every retention feature requires a database, player identity, and API services that do not exist. VGF's MemoryStorage is volatile. This is a 2-4 month backend project.

**Resolution: Persistence architecture design (RC-8) starts now. Implementation runs in parallel with v2.0 and v2.1 game development. Ships as part of v2.2.**

Components:
1. **Player Identity Service** — device fingerprint (v2.2), optional email/phone account linking (v2.3)
2. **Database** — Redis for hot state (jackpot, active sessions), DynamoDB for cold state (profiles, cosmetics, leaderboards, Crews)
3. **Profile/Inventory Service** — REST API for player data outside VGF
4. **VGF `IPersistence` Implementation** — concrete backing store for session state persistence

**Action:** The persistence architecture TDD must be completed before v2.0 ships.

### Decision 5: Three Card Poker Ships in v2.0

**Conflict:** PM review says cut TCP from v2. Principal engineer says TCP is the simplest new game and ideal for v2.0.

**Resolution: Three Card Poker ships in v2.0.**

Rationale:
- The principal engineer is right: TCP is the lowest-risk new game (6 phases, no complex bet persistence, simultaneous decisions work cleanly in VGF)
- It fills the "quick game" niche that neither Hold'em nor 5-Card Draw covers (20-second hands)
- It validates the multi-game architecture expansion with a simple game before Craps adds complexity
- The PM reviewer's concern ("not different enough from Hold'em") is addressed by the TIME difference, not the mechanic difference. TCP hands are 10x faster than Hold'em.

### Decision 6: Craps Simple Mode is Default

**From PM review (Risk #4):** The full craps betting menu will overwhelm casual players.

**Resolution: Craps launches with Simple Mode as default (Pass Line + Don't Pass only). Advanced Bets available via toggle.**

This is already addressed in the updated `CASINO-V2-NEW-GAMES.md` (PM-6 revision). The `CrapsConfig` state shape includes:

```typescript
interface CrapsConfig {
  simpleMode: boolean              // default: true
  // When true: only Pass Line, Don't Pass, and Field Bet shown
  // When false: full bet menu (Come, Don't Come, Place, Odds, etc.)
}
```

### Decision 7: Roulette Controller Gets Two-Tab Layout

**From principal engineer review (R2):** The single scrollable grid is poor UX on a 6-inch phone.

**Resolution: Two-tab controller layout.**

- **Tab 1 "Quick Bets" (default):** Red/Black, Odd/Even, High/Low, Dozens, Columns. Six large, easily tappable buttons. Covers 80%+ of casual roulette bets. Plus a "Repeat Last" button.
- **Tab 2 "Numbers":** Full number grid for inside bets (straight, split, street, corner). For experienced players.
- **Voice-first for numbers:** "Number 17", "Split 17 and 20" — voice is faster than scrolling.
- **Favourite numbers:** 3-5 preset "lucky number" buttons persisted per session.

**Action:** Update `CASINO-V2-NEW-GAMES.md` Section 12 with the two-tab design.

### Decision 8: Roulette Spin Uses Client-Driven Completion

**From principal engineer review (R5 / RC-6):** Don't rely on `setTimeout(6000)` alone for spin timing.

**Resolution: Same pattern as video playback.**

- Display dispatches `completeRouletteSpin` when ball-landing animation finishes
- Server has an 8-second hard timeout as fallback
- The `endIf` checks `state.roulette.spinComplete === true` (set by either client dispatch or server timeout)

**Action:** Update `CASINO-V2-NEW-GAMES.md` Section 8 (`ROULETTE_SPIN` phase).

---

## 2. v2.0 — "More Casino" Release

**Theme:** More games, faster play, zero setup friction.
**Timeline:** 6-8 weeks
**Goal:** Validate the multi-game architecture. Give players more reasons to play. Ship confidence-building features with low technical risk.

### Features

| Feature | Source Doc | Complexity | Technical Risk | Notes |
|---------|-----------|-----------|---------------|-------|
| **Roulette** | New Games | M | Medium | Two-tab controller (Decision 7). Client-driven spin completion (Decision 8). Per-game tutorial included. |
| **Three Card Poker** | New Games | S-M | Low | Simplest new game. 6 phases. Simultaneous decisions. Fix hand evaluator strength bug (principal eng M4). Per-game tutorial included. |
| **Speed Hold'em** | Existing Changes | S | Very Low | Config-driven: 10s timer, faster animations, auto-fold on timeout, auto-blind increase every 5 hands. |
| **Speed 5-Card Draw** | Existing Changes | S | Very Low | Config-driven: 15s timer, 10s draw timer, faster animations. |
| **Speed Blackjack** | Existing Changes | S | Very Low | Config-driven: auto-stand on hard 17+, faster cards, 10s bet timer. |
| **Quick-Play Mode** | Existing Changes | S | Low | Random game selection, auto-rotation every 10 hands/rounds. |
| **Casino Crawl** | Existing Changes | S | Low | Automated Game Night preset — all available games in random order. Reuses Game Night infrastructure (stub for v2.0: sequential game rotation without scoring). |
| **Reactions/Emotes** | Retention | S | Very Low | 6 reactions, rate-limited, TV display animation + audio. |
| **Per-game tutorials** | PM Review | S | Low | 30-second interactive first-play guides for Roulette and Three Card Poker. |

### What Casino Crawl Looks Like in v2.0 (Without Game Night Scoring)

In v2.0, Casino Crawl is a simplified auto-rotation: the system cycles through all available games, playing a set number of hands/rounds per game, then auto-switches. No scoring, no leaderboard, no champion ceremony — those arrive with full Game Night Mode in v2.1.

This gives players the "one-tap multi-game evening" experience immediately, and the scoring/competitive layer is added in the next release.

### Technical Prerequisites for v2.0

| Prerequisite | Owner | Notes |
|-------------|-------|-------|
| Fix TCP hand evaluator strength bug (M4) | Game dev | Rank-band bases must ensure monotonic ordering. See principal eng review. |
| Roulette two-tab controller design | UX/Game dev | Revise from single scrollable grid. |
| Roulette spin client-driven completion | Game dev | Same pattern as video playback. |
| Build-time reducer name collision check (RC-7) | Game dev | Test that verifies no duplicate reducer names across all game modules. |
| Fire TV Stick performance profiling | Engineering | Profile state size + broadcast frequency with 5-game state shape on baseline hardware. |
| `wrapWithGameNightCheck` utility in v2.0 round-complete phases | Game dev | Build the Game Night guard wrapper into all v2.0 round-complete `next` functions from the start (as a no-op when Game Night isn't active). This avoids refactoring every game's completion phase when v2.1 adds Game Night Mode. See principal eng W2. |
| Craps test suite specification (document) | QA/Game dev | Write the exhaustive list of bet type x outcome x player count test cases during v2.0 development. No code — just the scenario document. Having this ready at v2.0 ship (week 8) means Craps dev hits the ground running in v2.1. |

### v2.0 Does NOT Include

- Craps (ships in v2.1 — most complex game, needs exhaustive testing)
- Game Night Mode scoring/leaderboard/ceremony (ships in v2.1)
- Any persistence-dependent features (daily bonuses, challenges, profiles, etc.)
- Cosmetics, achievements, Crews, jackpot, tournaments
- Wild card or lowball variants
- Bounty tournament mode
- Additional Blackjack side bets

### v2.0 Analytics Events

| Event | Purpose |
|-------|---------|
| `game.started` | Track which games are played, how often, by how many players |
| `game.completed` | Session length, chip results, player count |
| `speed_variant.selected` | Adoption rate of speed modes |
| `quick_play.used` | How often Quick Play is chosen vs manual game selection |
| `casino_crawl.used` | Auto-rotation adoption |
| `game.switched` | Frequency and direction of game switching |
| `tutorial.started` / `tutorial.completed` / `tutorial.skipped` | Tutorial engagement rate |
| `reaction.sent` | Reaction usage frequency and type distribution |

These events establish baselines for v2.1 and v2.2 feature decisions.

---

## 3. v2.1 — "Game Night" Release

**Theme:** The structured competitive evening. The weekly ritual. THE product.
**Timeline:** 6-8 weeks after v2.0
**Goal:** Game Night Mode is the differentiator. Craps is the headliner game. Together they make Weekend Casino the best 90 minutes of the week.

### Features

| Feature | Source Doc | Complexity | Technical Risk | Notes |
|---------|-----------|-----------|---------------|-------|
| **Craps** | New Games | L | Medium-High | Simple Mode default (Decision 6). Come bet persistence rules. Batched bet resolution (RC-1). Exhaustive test suite required. Per-game tutorial included. |
| **Game Night Mode (full)** | Retention | L | Medium | Rank-based scoring (Decision 1). GN_SETUP, GN_LEADERBOARD, GN_CHAMPION phases. Champion ceremony with shareable results card. Streak tracking (local only — persistence adds cross-session streaks in v2.2). |
| **Casino Crawl upgrade** | Existing Changes | S | Low | Casino Crawl gets full Game Night scoring. It becomes "automated Game Night" instead of just auto-rotation. |
| **Shareable Results Card** | Retention | S | Low | PNG generation with final standings, highlight moment, branding, QR code. Web Share API on controller. |
| **Spectator Mode** | Retention | S | Low | Read-only controller mode. Spectators see TV summary, can send reactions. |
| **Blackjack Tournament Mode** | Existing Changes | M | Low | Fixed-hand tournament: equal starting chips, highest count after N rounds wins. Leaderboard overlay every 5 rounds. |

### Technical Prerequisites for v2.1

| Prerequisite | Owner | Notes |
|-------------|-------|-------|
| Game Night meta-phase routing activation | Game dev | Activate the `wrapWithGameNightCheck(innerNext)` utility (built as no-op in v2.0) to route to `GN_LEADERBOARD` when round limits are reached. Also wire in Craps round-complete phase. |
| Craps dice RNG specification (M1) | Game dev | `crypto.getRandomValues()`, seed stored for replay, distribution validation tests. |
| Craps come bet game-switch rule (RC-5) | Game dev | Active come bets returned to wallet at face value on game switch. |
| Craps "working" flag for Place bets (M2) | Game dev | `placeBetsWorkOnComeOut: boolean` checked in resolution logic. |
| Roulette near-miss wheel adjacency map (M3) | Game dev | Server-side adjacency detection for video triggers. |
| Craps bet resolution test suite | QA/Game dev | Exhaustive coverage of all bet types x all roll outcomes x multi-player scenarios. |
| GN_LEADERBOARD as asset preloading buffer (A3) | Game dev | Evict previous game's video assets, preload next game's during leaderboard display. |
| Video asset priority tiers | Art/Video | Premium assets for craps dice roll, Game Night ceremony. Placeholder animations for lower-priority moments. |
| Persistence architecture TDD (RC-8) | Backend | Design document for database, identity, API layer. Must be complete before v2.1 ships. |

### Parallel Workstream: Persistence Layer (Start During v2.0)

While v2.0 games are being built, the backend team starts on:

1. **Week 1-2:** Architecture TDD — database choice (Redis + DynamoDB recommended), schema design, API contracts, deployment topology
2. **Week 3-6:** Player Identity Service — device fingerprint-based identity, token generation, session association
3. **Week 5-8:** VGF `IPersistence` implementation with Redis backing store
4. **Week 7-10:** Profile Service — REST endpoints for player data, stats accumulation
5. **Week 9-12:** Inventory Service — cosmetics, achievements, challenge state
6. **Week 11-14:** Companion API — phone-only endpoints for bonus collection, challenge tracking

This workstream delivers infrastructure that enables v2.2 retention features.

---

## 4. v2.2 — "Come Back Tomorrow" Release

**Theme:** Daily engagement. The retention engine. This is where the DAU growth happens.
**Timeline:** 6-8 weeks after v2.1 (coincides with persistence layer completion)
**Goal:** Convert weekly Game Night players into daily-active users. Give players reasons to open the app between game nights.
**Hard dependency:** Persistence layer must be live.

### Features

| Feature | Source Doc | Complexity | Technical Risk | Notes |
|---------|-----------|-----------|---------------|-------|
| **Phone Companion Mode** | PM Review (new) | M | Medium | Standalone phone web app. Daily bonus collection, challenge tracking, profile view, push notifications. No TV required. |
| **Daily Login Bonuses** | Retention | S | Low | 7-day escalating cycle with streak multiplier. Collected via phone companion OR TV app. |
| **Weekly Challenges** | Retention | M | Medium | 3 slots (Bronze/Silver/Gold). Assignment algorithm weights underplayed games. Progress tracked via persistence layer. |
| **Player Profiles** | Existing Changes | M | Medium | Persistent stats, win rates, favourite game. Displayed on TV between games and on phone companion. |
| **Basic Cosmetics (20 items)** | Retention | M | Medium | Card backs, table felts, avatar frames. Earned via achievements. Displayed on TV. |
| **Achievement System (Phase 1: ~25 achievements)** | Existing Changes | M | Medium | Getting Started + per-game mastery milestones. Each unlocks a cosmetic. |
| **Game Night Streaks (cross-session)** | Retention | S | Low | Weekly streak counter persisted. Streak rewards at 2/4/8/12/26/52 weeks. |
| **Progressive Jackpot** | Retention | M | Medium | 3-tier (Mini/Major/Grand). 1% contribution from all bets. Persistent ticker on TV. Cross-session jackpot state in Redis. |

### v2.2 Analytics Events (Retention-Specific)

| Event | Purpose |
|-------|---------|
| `daily_bonus.claimed` | Track claim rate, streak length, channel (phone vs TV) |
| `daily_bonus.streak_broken` | Identify streak-breaking patterns |
| `challenge.assigned` / `challenge.completed` | Challenge engagement, cross-game discovery |
| `challenge.drove_new_game` | Did a challenge cause first play of a game? |
| `companion.opened` | Phone companion daily active usage |
| `companion.notification_received` / `companion.notification_tapped` | Push notification effectiveness |
| `cosmetic.unlocked` / `cosmetic.equipped` | Cosmetic engagement |
| `achievement.completed` | Achievement milestone tracking |
| `jackpot.contributed` / `jackpot.won` | Jackpot economy health |
| `profile.viewed` | Profile engagement |

---

## 5. v2.3+ — Data-Driven Iteration

**Theme:** Only ship what the data supports. No speculative features.
**Timeline:** Rolling 4-6 week sprints after v2.2
**Goal:** Double down on what works. Cut what doesn't.

### Candidates (Contingent on Data)

| Feature | Ship If... | Source |
|---------|-----------|--------|
| **Crews** | Companion adoption > 30% WAU AND identity persistence > 90% over 8 weeks | Retention |
| **Optional Account Linking (email/phone)** | Identity loss rate > 10% over 4 weeks (pre-Crews requirement) | PM Review |
| **SNG Tournaments** | Game Night completion rate > 50% AND tournament interest signal in analytics | Retention |
| **Bounty Tournament (Hold'em)** | Hold'em session frequency stable or growing | Existing Changes |
| **Wild Card Variant (5-Card Draw)** | 5-Card Draw play rate > 15% of total sessions | Existing Changes |
| **Extended Cosmetics (50+ items)** | Basic cosmetic equip rate > 40% of returning players | Retention |
| **Crew Leaderboards** | Crew creation > 1,000 Crews in first 4 weeks | Retention |
| **Additional Blackjack Side Bets (Lucky Ladies, Royal Match)** | Side bet participation > 30% in existing Blackjack sessions | Existing Changes |
| **Rabbit Hunting** | Hold'em session length stagnates (indicator players want more social moments) | Existing Changes |
| **Streaming Mode** | Organic stream count > 100/week | PM Review |
| **Replays/Highlights** | Results card share rate > 15% | Retention |

### Data Required Before v2.3 Decisions

| Metric | Source | Decision It Informs |
|--------|--------|-------------------|
| Game play distribution (% sessions per game) | v2.0 analytics | Which games to invest in further |
| Speed variant adoption rate | v2.0 analytics | Whether speed modes become defaults |
| Game Night completion rate | v2.1 analytics | Whether scoring/ceremony is working |
| Game Night return rate (% who play again within 7 days) | v2.1 analytics | Whether the weekly ritual is forming |
| Daily bonus claim rate (phone vs TV) | v2.2 analytics | Whether companion mode is working |
| Challenge completion rate by tier | v2.2 analytics | Challenge difficulty tuning |
| Cross-game play driven by challenges | v2.2 analytics | Whether challenges drive discovery |
| Identity persistence rate over 8 weeks | v2.2 analytics | Whether Crews are viable |
| Cosmetic equip rate | v2.2 analytics | Whether cosmetics matter to party players |
| Jackpot interest (opt-in rate for jackpot side bet) | v2.2 analytics | Whether play-money jackpots work |

---

## 6. Deferred to v3

These features require fundamental product or architectural changes beyond the scope of v2.

| Feature | Why Deferred | Prerequisite |
|---------|-------------|-------------|
| **Online Multiplayer (no TV)** | Breaks the TV-first constraint. Massively expands addressable market. Required for 1M DAU. | Separate PRD. Major VGF architecture work (multi-device sessions without a Display). |
| **Multi-TV Tournaments** | Multiple living rooms competing simultaneously. | Online multiplayer infrastructure. Tournament service. |
| **Lowball Variant** | Niche audience. Inverted hand rankings confuse casual players. | Wild card variant ships and is validated first. |
| **All-In Insurance** | Play-money context removes the "bad beat rage-quit" problem this solves. | Real-money play or data showing rage-quit is a real issue. |
| **Scheduled / Recurring Tournaments** | Requires players at specific times at specific locations. Doesn't fit the party model without online play. | Online multiplayer. Scheduling service. |
| **Clip Recording** | Platform-dependent (Fire TV Cube). Niche audience. | Fire TV Cube adoption data. Platform API investigation. |
| **Sic Bo** | Asian market expansion play. Requires localisation. | Localisation infrastructure. Asian market entry strategy. |
| **Let It Ride** | Low differentiation from Hold'em. | v2 game variety data showing demand for more poker variants. |
| **Battle Pass / Season Pass** | Monetisation layer. v2 has no monetisation. | Monetisation strategy. Persistence layer mature. |

---

## 7. Cut from v2

These features were in the original proposals but do not justify v2 engineering time based on review feedback.

| Feature | Original Priority | Why Cut | Could Revisit If... |
|---------|-----------------|---------|-------------------|
| **All-In Insurance** | P2 | Play-money context means bad beats are funny, not devastating. The wallet-deduction model is confusing. (PM review) | Data shows significant rage-quit after all-in losses. |
| **Lowball Variant** | P2 | Inverted rankings confuse casual players. Niche appeal. Medium complexity for low impact. (PM review) | 5-Card Draw becomes popular enough to warrant variant investment. |
| **Daily/Weekly Recurring Tournaments** | P1-P2 | "Daily tournament" assumes daily sessions. This is a weekly party game. Scheduling for co-located groups is a nightmare. (PM review) | Online multiplayer enables remote tournament participation. |

---

## 8. Open Technical Issues

Issues identified in reviews that require resolution during implementation.

| Issue | Source | Severity | Owner | Resolution |
|-------|--------|----------|-------|------------|
| TCP hand evaluator strength bug | Principal Eng M4 | High | Game dev | Use rank-band bases (6000/5000/4000/3000/2000/1000) to ensure monotonic ordering. Must be fixed before TCP ships. |
| Craps come bet game-switch rule | Principal Eng R3/RC-5 | Medium | Game dev | Active come bets returned to wallet at face value on game switch. Document and implement. |
| Craps dice RNG specification | Principal Eng M1 | Medium | Game dev | Use CSPRNG. Store seed in `ServerCrapsState`. Validate distribution in tests. |
| Craps "working" Place bets on come-out | Principal Eng M2 | Medium | Game dev | Ensure `placeBetsWorkOnComeOut` flag is checked in `resolveCrapsRoll`. |
| Roulette near-miss adjacency map | Principal Eng M3 | Low | Game dev | Server-side wheel-layout adjacency map for video trigger detection. |
| Craps bet error handling | Principal Eng M6 | Medium | Game dev | Validate wallet balance, table max, bet timing in all bet placement reducers. |
| State size on Fire TV Stick | Principal Eng R1 | Medium | Engineering | Profile with full 7-game state shape. Batch craps resolution (RC-1) if jank detected. |
| Game Night scoring contradiction | Principal Eng M5 | Resolved | PM | Rank-based system chosen (Decision 1). New games doc to be updated. |
| Reducer namespace collisions | Principal Eng A4/RC-7 | Low | Game dev | Build-time test verifying no duplicate names at same scope level. |

---

## 9. Risk Register

| Risk | Severity | Likelihood | Mitigation | Owner |
|------|----------|-----------|------------|-------|
| **Persistence layer takes longer than 14 weeks** | Critical | Medium | Start architecture TDD immediately. Use managed services (DynamoDB, ElastiCache) to reduce ops burden. Scope v2.2 retention features to what's ready. | Backend lead |
| **Fire TV Stick can't handle 7-game state broadcasts** | High | Low | Profile early (v2.0 prerequisite). Batch resolution dispatches. If critical: implement delta-based updates (VGF framework change). | Engineering |
| **Craps test coverage insufficient** | High | Medium | Mandate exhaustive test suite before Craps ships. Block v2.1 release on test coverage threshold. | QA lead |
| **Craps overwhelms casual players despite Simple Mode** | Medium | Medium | A/B test Simple Mode adoption. If > 60% stay in Simple Mode after 3 sessions, consider making it the only mode for v2.1. | PM |
| **Daily bonuses don't work without companion mode** | High | High | Companion mode is P0 in v2.2. If persistence layer delays, ship daily bonuses TV-only with reduced expectations. | PM + Backend |
| **Play-money economy makes retention mechanics feel hollow** | Medium | Medium | Monitor jackpot opt-in rate and streak continuation rate. If below thresholds (jackpot < 20%, streak < 40%), reconsider virtual currency scarcity (limit rebuys, add chip sinks). | PM |
| **Game Night scoring feels unfair to specialists** | Medium | Medium | Playtest scoring with internal team before launch. Monitor Game Night repeat rate by scoring margin. If losers don't return, adjust scoring bands. | PM + Game design |
| **Video asset production delays v2.1** | Medium | High | Ship with placeholder animations. Premium video for: craps dice roll, Game Night ceremony, roulette spin. Everything else can be placeholder. | Art lead |
| **Identity persistence loss over 8 weeks** | High | High | Track identity retention rate from v2.2 launch. If > 10% loss: expedite optional account linking to v2.3 priority. | Backend |

---

## 10. Success Metrics

### v2.0 Success Criteria (8 weeks post-launch)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Games played per session | >= 1.5 (up from 1.0 in v1) | Players are using multiple games |
| Roulette play rate | >= 15% of sessions | New game is finding an audience |
| TCP play rate | >= 10% of sessions | Quick-game niche is served |
| Speed variant adoption | >= 20% of sessions use a speed mode | Short-session use case is real |
| Quick Play / Casino Crawl usage | >= 10% of sessions | Low-friction modes are valued |
| Session length | Stable or increased vs v1 | More games didn't fragment sessions |
| Tutorial completion rate | >= 70% for first-time players of new games | Onboarding is working |

### v2.1 Success Criteria (8 weeks post-launch)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Game Night completion rate | >= 50% of Game Nights that start are finished | Players find the structured format engaging |
| Game Night weekly return rate | >= 40% of players who complete a Game Night play again within 7 days | The weekly ritual is forming |
| Craps play rate | >= 20% of sessions | The social energy thesis is validated |
| Results card share rate | >= 10% of Game Nights generate a share | Organic acquisition channel is active |
| Craps Simple Mode vs Advanced | >= 30% graduate to Advanced within 3 sessions | Tiered complexity is working |

### v2.2 Success Criteria (8 weeks post-launch)

| Metric | Target | Rationale |
|--------|--------|-----------|
| DAU/MAU stickiness | >= 22% (up from estimated ~15% in v2.0) | Daily engagement mechanics are working |
| Phone companion daily active rate | >= 30% of WAU open companion at least 3x/week | Companion mode is bridging the daily gap |
| Daily bonus claim rate | >= 40% of returning players claim at least 4/7 days | Streak mechanic is sticky |
| Challenge completion rate | >= 50% of assigned challenges completed | Challenges are achievable and motivating |
| Cross-game play driven by challenges | >= 20% of challenge completions are in a game the player hasn't played in 2+ weeks | Discovery engine is working |
| Identity persistence (8-week cohort) | >= 90% of players maintain identity | Persistence layer is reliable |

### North Star: v2 Overall

| Metric | Target | Timeline |
|--------|--------|----------|
| DAU | 50-100K | 6 months post v2.0 |
| WAU | 150-300K | 6 months post v2.0 |
| MAU | 300-500K | 6 months post v2.0 |
| DAU/MAU | 20-25% | Post v2.2 |

These numbers position Weekend Casino as the clear category leader for TV-first party casino games and establish the foundation for the v3 push toward 1M DAU via online multiplayer.

---

## Timeline Summary

```
Week 0          Week 8          Week 16         Week 24
|--- v2.0 ------|--- v2.1 ------|--- v2.2 ------|--- v2.3+ --->
|               |               |               |
| Roulette      | Craps         | Phone Comp.   | Data-driven
| TCP           | Game Night    | Daily Bonuses  | iteration
| Speed modes   | BJ Tournament | Challenges    |
| Quick Play    | Spectator     | Profiles      |
| Casino Crawl  | Share Card    | Cosmetics     |
| Reactions     |               | Achievements  |
| Tutorials     |               | Jackpot       |
|               |               | Streaks       |
|               |               |               |
|========= Persistence Layer (parallel) ========|
| TDD + Design  | Identity + DB | Services live |
```

---

*This roadmap consolidates proposals from PM, game design, and engineering teams. All decisions are traceable to specific review findings. The roadmap should be revisited after each release based on actual performance data.*
