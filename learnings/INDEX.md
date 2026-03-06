# Learnings Index

## Quick Reference by Task Type

| Task Type | Relevant Learnings |
|---|---|
| Three.js / R3F components | 001, 002, 005 |
| React context / state | 001 |
| TDD compliance | 002 |
| Refactoring / Module replacement | 003 |
| Test failures from interface changes | 003 |
| Wallet / stack / chip mutations | 004 |
| New game implementation | 004 |
| Dependencies / pnpm install | 005 |
| React 19 compatibility | 005 |
| VGF dispatch / reducers | 006, 009, 015 |
| VGF phase internals / cascade | 009, 015 |
| VGF 4.8.0 migration / WGFServer | 015 |
| PlatformProvider / auth / VPN | 015 |
| Multi-agent type integration | 007 |
| vi.mock factory sync | 007 |
| Vitest vs typecheck/build | 007 |
| Shared type changes | 003, 007 |
| Controller-server integration | 006 |
| Security fixes / closing paths | 008, 016 |
| Voice pipeline security | 008 |
| Host-only access control | 008 |
| Phase config reducer exposure | 006, 008 |
| Connection registry spoofing | 016 |
| Socket.IO identity validation | 016 |
| Private data routing | 016 |
| VGF broadcast message format | 017 |
| Manual state broadcast | 017 |
| Client Zod schema validation | 017 |
| Redis client consolidation | 018 |
| Connection leaks / shutdown | 018 |
| Docker container security | 019 |
| Non-root containers | 019 |
| BuildKit secrets | 019 |
| Retention / persistence | 010 |
| API contract testing | 010 |
| Session-scoped state | 010 |
| Atomic state transitions | 010 |
| Challenge/achievement system | 010, 011 |
| Weekly challenge backfill | 011 |
| Voice intent routing | 012 |
| Playwright multi-page testing | 013 |
| JS operator precedence | 014 |

## Summaries

### 001 — useRef + useMemo closure capture bug
**Severity:** Critical
**Category:** React, Three.js
When `useMemo` closures capture `ref.current` at memo-time, they hold a stale reference if the ref is later reassigned in a `useEffect`. Closures must read `ref.current` at call-time instead.

### 002 — TDD spec drift in shadow map type
**Severity:** Medium
**Category:** Three.js, Performance
Agent used `PCFSoftShadowMap` instead of TDD-specified `PCFShadowMap`. Soft shadows are more expensive. Always cross-check rendered config against TDD performance specs.

### 003 — Backwards-compatibility exports and superset state
**Severity:** High
**Category:** Architecture, Testing, Refactoring
When replacing a module with a new version aliased to the old name, the new state factory must be a strict superset of the old interface. Missing fields, changed reducer signatures, and stub reducers cause cascading test failures.

### 004 — Wallet and stack floor-of-zero guards
**Severity:** Critical
**Category:** Game Logic, Wallet Integrity
Every reducer/thunk that modifies wallet balances or player stacks must enforce `Math.max(0, ...)`. Every chip division must use `Math.floor()`. Every deduction must validate sufficient balance first. Failure to do so allows negative balances and fractional chips.

### 005 — React Three Fiber + React 19 reconciler incompatibility
**Severity:** Critical
**Category:** React, Three.js, Dependencies
R3F v8 uses `react-reconciler@0.27.0` which is incompatible with React 19.2+ (missing `ReactCurrentOwner` internal). Fatal runtime error at module import time. Fix: upgrade R3F to v9+, drei to v10+. Never use R3F v8 with React 19.

### 006 — Controller dispatch names must match server reducer registration
**Severity:** Critical
**Category:** VGF, State Management, Client-Server
Controller dispatches actions by string name; VGF looks them up in the ruleset's `reducers`/`thunks` objects. Mismatched names cause silent `DispatchTimeoutError` (no "reducer not found" error). Always verify dispatch names match server registration exactly.

### 007 — Vitest passing does not mean the build passes: type integration failures after multi-agent work
**Severity:** Critical
**Category:** Multi-Agent, TypeScript, Build Pipeline
Vitest strips TypeScript types at transform time and does NOT enforce type correctness. Three parallel agents produced 1,305 passing tests but 80+ TypeScript errors. `pnpm typecheck` and `pnpm build` are MANDATORY verification steps — not optional. After merging multi-agent output, always run all three: typecheck, build, tests.

### 008 — Security fixes must close ALL paths, not just add new ones
**Severity:** Critical
**Category:** Security, Multi-Agent, Code Review
"Additive-only" security fixes — creating a new secure path (thunk with validation) without removing or gating the old insecure path (raw reducer still in phase config, old dispatches still in controllers). Three examples: host-only game selection left old `selectGame` reducer exposed; hole card privacy left `setHoleCards` broadcasting to public state; voice pipeline bypassed `processPlayerAction` validation. For every security fix, map ALL paths to the vulnerability, close every one, and write negative tests proving the old paths are blocked.

### 011 — Weekly challenge backfill must NOT use lifetime stats
**Severity:** High
**Category:** Retention, Challenges, Game Economy
Using lifetime cumulative stats (totalHandsPlayed, totalHandsWon) to initialise weekly challenge progress causes instant completion for returning players. Weekly challenges must only count activity within the challenge period — start at zero if you can't distinguish weekly from lifetime.

### 012 — Voice intents must have both parsing AND routing
**Severity:** Critical
**Category:** Voice Pipeline, Client-Server
Adding intent patterns to `parseVoiceIntent.ts` without adding routing in `processVoiceCommand` creates a silent failure — intents parse correctly but are never dispatched to game actions. Always check both sides (parser + router) when adding new intents.

### 013 — Playwright `.or()` only works with same-page locators
**Severity:** Critical
**Category:** E2E Testing, Playwright
`.or()` combinator silently fails or produces incorrect results when combining locators from different Playwright Page objects. For multi-player tests, always assert on each page separately.

### 014 — JS `??` has lower precedence than comparison operators
**Severity:** Medium
**Category:** JavaScript, Operator Precedence
`a ?? b >= c` evaluates as `a ?? (b >= c)`, not `(a ?? b) >= c`. Always wrap `??` in parentheses when combining with comparison or arithmetic operators.

### 010 — Retention system integration review (13 findings across 3 review passes)
**Severity:** Critical
**Category:** Persistence, API Contracts, Session State, Atomicity
Side-channel persistence systems (profiles, achievements, challenges, cosmetics) need complete write pipelines, not just storage + detection. Key lessons: (1) Define API contracts before building server+client in parallel — mock-heavy tests create false confidence. (2) Module-level Maps for session tracking MUST include sessionId in keys and wire cleanup to disconnect. (3) Never use setTimeout for critical state mutations — dispatch synchronously, snapshot original state for rollback. (4) String cross-references between definition tables need referential integrity tests. (5) Calendar math: never approximate (dayOfYear/7), use explicit day-of-week calculations.

### 015 — VGF 4.8.0 Migration (from emoji-multiplatform)
**Severity:** Critical
**Category:** VGF, Phase Management, WGFServer, PlatformProvider
Three breaking changes in VGF 4.8.0: (1) `PhaseModificationError` — reducers cannot modify `state.phase`, use `nextPhase` + `TRANSITION_TO_PHASE` thunk + `endIf`/`next` pattern. (2) `WGFServer` does NOT call `onConnect`/`onDisconnect` lifecycle hooks — move all session setup to client-initiated thunks. (3) PlatformProvider auth requires Volley VPN for local dev. Sourced from emoji-multiplatform migration; see full details in `emoji-multiplatform/learnings/038`.

### 016 — Connection Registry Must Validate Session Membership
**Severity:** Critical
**Category:** Security, VGF, Private Data
Socket.IO handshake query params (`userId`, `sessionId`, `clientType`) are entirely client-controlled. A malicious client can spoof a `userId` matching another player, overwriting their connection registry entry and hijacking private data (hole cards). Always validate `userId` against VGF session membership via `storage.getSessionMemberById()` BEFORE registering connections. Same principle as Learning 008 applied to Socket.IO.

### 017 — VGF Broadcast Message Format Must Match Client Schema
**Severity:** Critical
**Category:** VGF, State Management
VGF clients validate incoming messages via Zod schemas. Manual broadcasts must use uppercase `TYPE` (`STATE_UPDATE` not `state_update`) and full session envelope (`{ session: { sessionId, members, state } }` not bare `{ state }`). Direct `storage.updateSessionState()` bypasses GameRunner — no state freezing, no `endIf` checks, no version increment. Use only as last resort when VGF dispatch isn't available.

### 018 — Redis Client Consolidation in Server Processes
**Severity:** High
**Category:** Infrastructure, Redis, Production
Don't create multiple Redis clients per server process. Weekend Casino had three (resilient, persistence, scheduler) with different retry configs, causing inconsistent failure modes, connection leaks on shutdown, and resource waste. Create ONE shared resilient client, pass it to all consumers via dependency injection, close it in a single shutdown path.

### 019 — Docker Container Security Checklist
**Severity:** High
**Category:** Docker, Security, DevOps
Mandatory for production Docker images: (1) Never run as root — add `USER` directive. (2) Use `/health/ready` (readiness) not `/health` (liveness) for `HEALTHCHECK`. (3) Don't copy devDependencies into production image. (4) Use BuildKit secrets for npm tokens — never bake into layers. (5) Add Redis volume mounts in docker-compose. (6) Pin base image versions (`node:22-alpine`, not `node:latest`).

## Cross-Reference

| Topic | Learnings |
|---|---|
| useRef + useMemo | 001 |
| Closure capture | 001 |
| Shadow maps | 002 |
| Performance budget | 002 |
| TDD compliance | 002 |
| Backward compatibility | 003 |
| Module replacement | 003 |
| Reducer signatures | 003 |
| Wallet integrity | 004 |
| Chip floor-of-zero | 004 |
| Fractional chips | 004 |
| Balance validation | 004 |
| R3F + React 19 | 005 |
| react-reconciler | 005 |
| pnpm lockfile changes | 005 |
| Dispatch name mismatch | 006 |
| DispatchTimeoutError | 006 |
| Button does nothing | 006 |
| Multi-agent merge failures | 007 |
| Vitest vs typecheck | 007 |
| Build fails, tests pass | 007 |
| Shared type required fields | 003, 007 |
| Hook generic migration | 007 |
| Worktree isolation pitfalls | 007 |
| Additive-only security fixes | 008 |
| Close all insecure paths | 008 |
| Negative security tests | 008 |
| Host-only access control | 008 |
| Hole card privacy | 008 |
| Voice pipeline bypass | 008 |
| Phase config reducer exposure | 006, 008 |
| selectGameAsHost | 008 |
| requestMyHoleCards | 008 |
| processPlayerAction | 008 |
| Retention system integration | 010 |
| API contract mismatch | 010 |
| Side-channel write pipeline | 010 |
| Calendar math approximation | 010 |
| REST auth in dev mode | 010 |
| Reward claim completion | 010 |
| Multi-game challenge counting | 010 |
| Per-game stats population | 010 |
| Cross-reference integrity | 010 |
| setTimeout for state mutations | 010 |
| Session-scoped module state | 010 |
| Rollback snapshot vs synthetic | 010 |
| Single source of truth (browser APIs) | 010 |
| UI label vs backend semantics | 010 |
| VGF phase callback context | 009 |
| ctx.dispatch in onBegin | 009 |
| reducerDispatcher vs dispatch | 009 |
| thunkDispatcher vs dispatchThunk | 009 |
| onBegin must return GameState | 009 |
| Phase transition crash | 009 |
| VGF endIf limitations | 009 |
| VGF dev scheduler NoOp | 009 |
| reducerDispatcher is arrow fn | 009 |
| Root reducers in all phases | 009 |
| Phase cascade is recursive | 009 |
| VGF throws on bad reducer name | 009 |
| vi.mock sync with imports | 007 |
| Weekly backfill from lifetime stats | 011 |
| Time-bounded vs cumulative counters | 011 |
| Challenge instant completion | 011 |
| Voice parse without routing | 012 |
| processVoiceCommand routing gap | 012 |
| Silent voice intent drop | 012 |
| Playwright .or() cross-page | 013 |
| Multi-page E2E assertions | 013 |
| Nullish coalescing precedence | 014 |
| ?? vs >= operator binding | 014 |
| VGF 4.8.0 PhaseModificationError | 015 |
| WGFServer no onConnect/onDisconnect | 015 |
| TRANSITION_TO_PHASE / nextPhase | 015 |
| ensureLocalHubSessionId | 015 |
| auth-dev.volley.tv CORS / VPN | 015 |
| DevScheduler thunk context wiring | 015 |
| Connection registry spoofing | 016 |
| Socket.IO handshake validation | 016 |
| userId spoofing / identity hijack | 016 |
| getSessionMemberById | 016 |
| Private data routing (hole cards) | 016 |
| Client-supplied identity trust | 016 |
| VGF broadcast message format | 017 |
| STATE_UPDATE uppercase type | 017 |
| Full session envelope broadcast | 017 |
| storage.updateSessionState bypass | 017 |
| Zod schema silent rejection | 017 |
| Stale client state after update | 017 |
| Multiple Redis clients | 018 |
| Redis retry config inconsistency | 018 |
| Connection leak on shutdown | 018 |
| Redis dependency injection | 018 |
| Docker non-root USER directive | 019 |
| HEALTHCHECK readiness vs liveness | 019 |
| devDependencies in production | 019 |
| BuildKit secrets for npm tokens | 019 |
| Redis volume persistence | 019 |
| Unpinned base images | 019 |
| hadolint / trivy image scanning | 019 |
