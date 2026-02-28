# Learning 004: Wallet and Stack Floor-of-Zero Guards

**Date:** 2026-02-28
**Category:** Game Logic, Wallet Integrity
**Severity:** Critical

## The Mistake

Multiple reducers and thunks that modify wallet balances and player stacks did not enforce a floor of zero. This allowed negative balances to propagate through the state, which in a casino game is a fundamental integrity violation — chips cannot be destroyed or created from nothing.

### Specific instances:
- `casinoUpdateWallet` — applied delta without floor (W1)
- `casinoSetWalletBalance` — accepted any value including negative (W2)
- `holdemReducers.updatePlayerBet` — stack could go negative from over-betting (H3)
- `tcpMakeDecision` — deducted play bet without checking wallet balance (TCP2)
- `bjSettleBets` — surrender returned `hand.bet / 2` (fractional chips for odd bets) (BJ2)

## Why This Is Wrong

- Negative wallet balances break the closed-chip-economy invariant
- Players could effectively get "free chips" by exploiting negative state
- Fractional chips accumulate rounding errors across rounds
- These are the kind of bugs that look harmless in tests but cause real player frustration

## The Correct Process

1. **Every reducer/thunk that modifies wallet or stack must enforce `Math.max(0, ...)`**
2. **Every deduction must validate sufficient balance first** — if insufficient, either reject or auto-fold
3. **Use `Math.floor()` for any division** that produces chip amounts (no fractional chips)
4. **Validate at the mutation boundary** — the reducer itself should be the last line of defence, not the caller

### Pattern:
```typescript
// Wallet update — always floor at zero
[playerId]: Math.max(0, (state.wallet[playerId] ?? 0) + delta)

// Direct set — always floor at zero
[playerId]: Math.max(0, amount)

// Deduction with validation — check before acting
const walletBalance = state.wallet[playerId] ?? 0
if (walletBalance < requiredAmount) {
  // Reject or auto-fold
  return
}

// Division producing chips — always floor
Math.floor(hand.bet / 2)
```

## Red Flags to Watch For

- Any wallet/stack mutation without `Math.max(0, ...)`
- Any chip division without `Math.floor()`
- Any deduction without a preceding balance check
- Any new game added that touches wallet without reviewing these patterns

## Prevention

- Add a lint rule or code review checklist item for wallet/stack mutations
- All new games must follow the same floor-of-zero guard pattern
- Regression test: attempt to go negative and verify clamping
