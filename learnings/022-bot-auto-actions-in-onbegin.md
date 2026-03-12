# 022 — Bots must auto-resolve ALL phase prompts in onBegin

**Severity:** High
**Category:** VGF, Bot Logic, Phase Lifecycle

## Problem

The Blackjack game froze at `BJ_INSURANCE` when the dealer showed an Ace. The human player
took/declined insurance, but the bot never resolved its insurance decision. The `endIf` check
(`insuranceComplete === true`) requires ALL players to have `insuranceResolved === true`, so
the phase hung indefinitely.

## Root Cause

The `bjInsurancePhase.onBegin` had two branches:
1. If dealer does NOT show Ace → auto-decline insurance for ALL players → set `insuranceComplete`
2. If dealer shows Ace → set dealer message "Insurance?" → **nothing for bots**

Branch 2 waited for player input via thunks (`bjProcessInsurance`), but bots can't dispatch
thunks — they have no controller to tap buttons.

## The Fix

In the `else` branch (dealer shows Ace), after setting the dealer message, auto-decline
insurance for all bots:

```typescript
// Auto-decline insurance for bots — they can't respond to prompts
const afterState = ctx.getState()
for (const ps of afterState.blackjack!.playerStates) {
  const player = afterState.players.find(p => p.id === ps.playerId)
  if (player?.isBot && !ps.insuranceResolved) {
    ctx.reducerDispatcher('bjDeclineInsurance', ps.playerId)
  }
}

// Check if all players resolved after bot auto-declines
const postBot = ctx.getState()
if (postBot.blackjack!.playerStates.every(ps => ps.insuranceResolved)) {
  ctx.reducerDispatcher('bjSetInsuranceComplete', true)
}
```

## General Pattern

Every phase that requires player input must also handle bots in `onBegin`:
- **BJ_PLACE_BETS**: Bots auto-place minimum bet ✓ (was already implemented)
- **BJ_INSURANCE**: Bots auto-decline insurance ✓ (was missing, now fixed)
- **BJ_PLAYER_TURNS**: Bots auto-stand ✓ (was already implemented)
- **BJ_HAND_COMPLETE**: Bots auto-advance (if no humans) ✓

## Red Flags

- Any phase `endIf` that checks `.every()` across all players — bots can't act on their own
- Any "waiting for input" phase that doesn't auto-resolve bots in `onBegin`
- Adding a new input phase without checking the bot path

## Prevention

When creating a new phase that requires player input:
1. Identify what action bots should take (auto-bet, auto-decline, auto-fold, etc.)
2. Add bot auto-action in `onBegin` AFTER setting up the phase
3. Check if all players have resolved after bot auto-actions
4. If all resolved, set the phase completion flag immediately
