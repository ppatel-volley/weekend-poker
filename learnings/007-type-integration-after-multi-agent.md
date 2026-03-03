# 007 — Vitest passing does not mean the build passes: type integration failures after multi-agent work

**Severity:** Critical
**Category:** Multi-Agent, TypeScript, Build Pipeline, Testing

## Problem

Three parallel agents implemented v2.0 features (Roulette, speed variants, reactions/emotes) in
isolated git worktrees. All agents reported success: 1,305 tests passing. The team lead verified
with `vitest run` and confirmed all tests green.

However, `pnpm typecheck` and `pnpm build` both **FAILED** with 80+ TypeScript errors across all
four packages. The codebase was not shippable despite 100% test pass rate.

## Root Cause

**Vitest strips TypeScript types at transform time** (via esbuild/swc) for speed. It does NOT
enforce type correctness. A file with completely wrong types will still pass vitest as long as the
runtime JavaScript behaviour is correct.

### Specific failure modes

1. **Missing import (`Card` type):** Agent added game sub-state interfaces referencing `Card` but
   never imported it. Vitest didn't care. TypeScript did.

2. **Required field added to shared type:** The reactions agent added `reactions: ReactionEvent[]`
   as a required field on `CasinoGameState`. Every test fixture in every other agent's worktree
   that constructs a `CasinoGameState` was now missing a required field. Each agent's worktree
   compiled fine in isolation because they only saw their own version of the type.

3. **Hook generics stuck on old types:** `useVGFHooks.ts` used `getVGFHooks<any, PokerGameState,
   PokerPhase>()` but the codebase had migrated to `CasinoGameState`/`CasinoPhase`. This forced
   every consumer to use unsafe `as CasinoGameState` casts. Vitest didn't flag any of these
   because the casts are valid JavaScript at runtime.

4. **Unused imports/variables:** Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`)
   catches these. Vitest does not.

## Why It Wasn't Caught

1. Agent prompts said "run `npx vitest run`" — they did NOT include `pnpm typecheck` or `pnpm build`
2. The team lead only ran `vitest run` for post-merge verification
3. AGENTS.md Section 4 already required typecheck + build, but agents didn't follow it
4. Worktree isolation meant each agent's code was internally consistent but incompatible with
   other agents' changes

## The Correct Process

**Every agent prompt MUST include all three verification commands:**
```bash
pnpm typecheck      # TypeScript strict checking
pnpm build          # Production build
pnpm test -- --run  # Runtime behaviour
```

**After merging multi-agent output, the lead MUST re-run all three.** This is the integration
verification step — it catches cross-agent type conflicts that couldn't be detected in isolation.

## Red Flags to Watch For

- Agent reports "all tests pass" but doesn't mention typecheck or build
- Verification Block shows `Types: NOT RUN` or `Build: NOT RUN`
- Multiple agents modifying the same shared type (e.g., `CasinoGameState`)
- One agent adding required fields to a type that other agents construct in tests
- `as` type casts appearing in new code (often a sign the types don't actually match)
- Hook/provider generics that haven't been updated after a type migration

## vi.mock Must Stay in Sync with Component Imports (added 2026-03-03)

When a component adds a new import from a mocked module, the test's `vi.mock` factory MUST
export the new symbol. Vitest throws a clear error:

```
No "V2_0_GAMES" export is defined on the "@weekend-casino/shared" mock.
Did you forget to return it from "vi.mock"?
```

**Example:** `LobbyController.tsx` added `V2_0_GAMES` import → `GameRouter.test.tsx` mock needed
`V2_0_GAMES: ['roulette', 'three_card_poker']` added to the factory.

**Rule:** After adding an import to any component, grep for `vi.mock` of that module in test files
and add the new export to every mock factory.

## Prevention

1. **AGENTS.md updated:** Verification Block now marks typecheck and build as MANDATORY with
   explicit commands. Pre-Completion Checklist has HARD GATE labels.
2. **New "Multi-Agent Integration Verification" section** added to AGENTS.md Section 9 with
   post-merge checklist and common failure patterns.
3. **Keyword triggers added** to AGENTS-PROJECT.md: "shared type", "required field", "hook
   generics", "typecheck", "build failure", "worktree", "parallel agent", "merge", "integration"
   all link to this learning.
4. **Rule of thumb:** If an agent adds a required field to any shared type, it MUST also update
   every test fixture that constructs that type — or make the field optional with a default.
