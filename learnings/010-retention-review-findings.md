# Learning 010: v2.2 Retention Review Findings

**Date**: 2026-03-03
**Context**: v2.2 "Come Back Tomorrow" retention system code review

## Key Findings

### 1. API Contract Mismatch (Critical)
**Problem**: Server returned `{ challenges: ChallengeSummary[] }` but controller expected `ActiveChallenge[]` with `.definition.*` nested fields.

**Root cause**: Controller was built against the full `ActiveChallenge` type while the server route converted to a slimmer `ChallengeSummary` for "display-only" projection. The test mocked the ideal shape, not the real API response.

**Fix**: Server returns `ActiveChallenge[]` directly (no conversion to summaries for the REST endpoint). The VGF state projection still uses summaries.

**Lesson**: When building server + client in parallel, define the API contract FIRST (e.g., OpenAPI spec or shared response type). Mock-heavy tests can create false confidence when the mock doesn't match the real API shape. Always add at least one "contract test" that exercises the real handler.

### 2. Side-Channel Data Needs a Pipeline, Not Just Storage
**Problem**: Persistence stores were built (player-store, challenge-store, etc.) but no gameplay code actually WROTE to them. Stats remained at defaults forever, so stat-based achievements and most challenges were inert.

**Root cause**: The plan focused on "stores" and "detection" but didn't explicitly plan the "event emission pipeline" — the code that translates game outcomes into persistence updates.

**Lesson**: When building a side-channel persistence system alongside a game framework:
- Define the **write path** before the read path
- For each stored metric, trace: "which game event produces this value?"
- Add integration tests that go: game event → stat update → achievement detection → cosmetic unlock

### 3. Week Rotation: Don't Approximate Calendar Math
**Problem**: Week identifier used `ceil(dayOfYear / 7)` which doesn't align to Monday boundaries and breaks at year transitions.

**Fix**: Explicit Monday-based UTC week calculation: find the Monday at-or-before the date, count weeks from Jan 1 of that Monday's year.

**Lesson**: Calendar math is deceptively hard. Never approximate with `dayOfYear / 7`. Use explicit day-of-week calculations or a library.

### 4. REST Endpoints Need Auth Even in Dev
**Problem**: Retention REST endpoints trusted raw deviceToken path params with no ownership validation.

**Fix**: Added middleware checking `x-device-token` header matches route param. Production will use Platform SDK JWT.

**Lesson**: Any endpoint that reads/writes player-specific data needs ownership validation from day one, even in dev. Token-in-URL is an internal key, not an authorization credential.

### 5. Reward Claim Must Close the Loop
**Problem**: Challenge claim endpoint returned `{ success: true, rewardChips: N }` but didn't actually credit chips, XP, or stats.

**Lesson**: Any "claim" or "redeem" endpoint must atomically apply ALL reward effects (wallet, XP, stats, progression counters) in a single transaction. A success response without actual reward application creates player distrust.

## Round 2 Findings (2026-03-03)

### 6. Multi-Game Challenge Over-Counting
**Problem**: `silver_play_3_games` incremented on every `hand_complete` when the session game list was non-empty.
**Fix**: Pass `currentValue` into evaluator; only increment by `uniqueCount - currentValue` (delta).
**Lesson**: Challenges tracking unique counts must use absolute value comparison, not additive increments.

### 7. Per-Game Stats Never Populated
**Problem**: `stats.byGameType[game]` was checked by achievement detection but never written to.
**Fix**: Added `updateGameTypeStats()` to player-store, called from challenge-utils after each hand.
**Lesson**: When detection reads a field, grep for all WRITE paths to that field before shipping.

### 8. Cross-Contract Integrity (unlocksAchievement)
**Problem**: Challenge definitions declared `unlocksAchievement` but claim route ignored it. `challenge_champion` was referenced but not defined.
**Fix**: Added missing achievement, wired claim route to grant achievement + cosmetic.
**Lesson**: String-based cross-references between definition tables need referential integrity checks in tests.

### 9. Daily Bonus Atomicity
**Problem**: `setTimeout` for wallet credit after `addPlayer` could fail silently on disconnect.
**Fix**: Hoisted bonus result, dispatch synchronously after `addPlayer`, revert persistence on dispatch failure.
**Lesson**: Never use `setTimeout` for critical state mutations. Dispatch synchronously and handle failure inline.

## Round 3 Findings (2026-03-03)

### 10. Module-Level State Must Be Session-Scoped
**Problem**: `sessionGamesPlayed` Map was keyed by `persistentId` only, persisting across table sessions while the server stayed up. A player rejoining a new session inherited stale game-type tracking from their previous session.
**Fix**: Key by `sessionId:persistentId`. Clear entries in `onDisconnect`. Export `clearSessionTracker()` for teardown.
**Lesson**: Any module-level `Map` or `Set` used for per-session tracking MUST include `sessionId` in its key. Without session scoping, state leaks across sessions and produces incorrect behaviour for returning players. Always wire cleanup into disconnect/session-end handlers.

### 11. Rollback State Must Be an Exact Snapshot
**Problem**: Daily bonus rollback wrote synthetic values (`lastClaimDate: null`, `totalClaimed: 0`) instead of restoring the original state, potentially erasing valid historical data.
**Fix**: Snapshot `{ ...profile.dailyBonus }` before mutation, restore exactly that on failure.
**Lesson**: When implementing optimistic write + rollback, always snapshot the ORIGINAL state before mutation. Never construct a "reset" state from derived values — you'll lose data that existed before your transaction.

### 12. Single Source of Truth for Browser API Access
**Problem**: `App.tsx` had its own `getOrCreateUserId()` using raw `localStorage` + `crypto.randomUUID()`, while `useDeviceToken` hook had the same logic with proper fallbacks. Two code paths, only one had safety guards.
**Fix**: Deleted `getOrCreateUserId()` from App.tsx, imported `useDeviceToken` hook instead.
**Lesson**: Never duplicate browser API access patterns. Create one hook/utility with all the error handling and fallbacks, then use it everywhere. Duplicated paths inevitably diverge in safety coverage.

### 13. UI Labels Must Match Backend Semantics
**Problem**: Controller showed "Daily Challenges" but backend rotates weekly (Monday UTC).
**Fix**: Renamed to "Weekly Challenges".
**Lesson**: UI copy should be derived from or validated against the backend's actual behaviour. When implementing features in parallel (server + client), add a comment or constant that links the UI label to the backend rotation logic.

## Round 4 Finding (2026-03-03)

### 14. Transient Disconnect vs True Session Leave
**Problem**: `clearSessionTracker()` was called on every `onDisconnect`, but mid-game disconnects are transient (player marked disconnected, not removed). Reconnecting the same player in the same game session lost their accumulated `gamesPlayedThisSession`.
**Fix**: Only clear tracker when player is truly removed (lobby disconnect). Preserve tracker across transient mid-game disconnects.
**Lesson**: Distinguish between "connection lost temporarily" and "player left the session" when cleaning up per-session state. In VGF, lobby disconnect = removal, mid-game disconnect = marked disconnected (player persists in state). Cleanup should match the actual lifecycle event, not just "socket closed".

## Summary Rules

> **Rule 1 — Pipeline Completeness**: Side-channel persistence needs THREE things:
> 1. **Write pipeline** (game events → stat updates)
> 2. **Detection** (stats → achievements/challenges)
> 3. **Reward application** (achievements/claims → economy effects)
> Missing any one makes the system inert.

> **Rule 2 — Contract-First Development**: When building server + client in parallel:
> - Define shared response types or use contract tests
> - Never mock idealized shapes that differ from real API responses
> - Add at least one integration test per endpoint that exercises the real handler

> **Rule 3 — Session-Scoped State**: Any module-level tracking (`Map`, `Set`, cache) used for per-session logic MUST include `sessionId` in its key and wire cleanup into disconnect handlers.

> **Rule 4 — Atomic State Transitions**: For any claim/redeem/bonus flow:
> - Snapshot original state before mutation
> - Apply all effects synchronously (no `setTimeout`)
> - On failure, restore exact snapshot (never synthesize a "reset" state)
