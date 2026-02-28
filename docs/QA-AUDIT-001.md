# QA Audit Report #001

> **Date:** 2026-02-28
> **Auditor:** Senior QA Engineer Agent
> **Build:** Post Phase 3 + BJ Classic in progress
> **Status:** Awaiting fix prioritisation

---

## Summary

**25 issues found** across 7 systems.

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 7 |
| Medium | 11 |
| Low | 6 |

## Top 5 Priority Fixes

1. **W1 + TCP2 + H3**: Wallet/stack can go negative — add floor-of-zero guards
2. **H5 + TCP3**: No timeout/auto-fold for disconnected players — phases hang indefinitely
3. **W3**: Wallet vs stack dual-currency divergence — Hold'em/Draw use stacks, TCP/BJ use wallets
4. **D1**: `drawExecuteReplace` never called in draw phase flow — replacements not applied
5. **BOT1**: No timeout on bot decisions — Claude API hang blocks game

## Critical

- **W1**: `casinoUpdateWallet` can produce negative balances (casino-state.ts:122)

## High

- **W2**: `casinoSetWalletBalance` accepts any value, no validation (casino-state.ts:133)
- **W3**: Hold'em/Draw operate on stacks, TCP/BJ on wallets — never synced (casino-ruleset.ts:111)
- **H2**: All-in runout burns 2 cards per community card instead of 1 (casino-ruleset.ts:836)
- **H3**: `updatePlayerBet` allows stack to go negative (casino-ruleset.ts:111)
- **H5**: Disconnected player during turn causes indefinite hang (no timeout/auto-fold)
- **TCP2**: Play bet wallet validation missing — wallet goes negative (tcp-thunks.ts:138)
- **BOT1**: No timeout wrapper on bot decisions (casino-ruleset.ts:431)

## Medium

- **H1**: Heads-up all-in-from-blinds edge case — activePlayerIndex = -1
- **D1**: drawExecuteReplace never dispatched in draw phase flow
- **D3**: Draw betting uses Hold'em's isPreFlop check (false for Draw phases)
- **TCP1**: Pair Plus without ante possible via direct reducer dispatch
- **TCP3**: No decision timeout — AFK player hangs phase
- **BJ1**: Double down bet field not updated (works by convention but fragile)
- **BJ2**: Surrender returns fractional chips (Math.floor needed)
- **BJ3**: No busted-player check in BJ hand complete
- **V2**: Voice command during wrong phase not rejected — stale lastAction
- **E2E1**: 30s server boot timeout may be insufficient for cold start
- **E2E2**: Test fixture isolation needs verification

## Low

- W4, D2, TCP4, BJ4, BOT2, BOT3, V1, V3 (see full report)

## Full Details

See QA engineer agent message (2026-02-28) for complete reproduction steps, file references, and analysis per finding.
