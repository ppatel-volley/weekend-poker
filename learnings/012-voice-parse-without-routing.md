# Learning 012: Voice intents must have both parsing AND routing

**Date**: 2026-03-03
**Context**: Adding craps voice commands to Weekend Casino
**Severity**: Critical

## What Happened

8 craps voice intents were added to `parseVoiceIntent.ts` (the parser) and the `VoiceIntent` type in `events.ts`. The intents parsed correctly — saying "pass line" produced `{ intent: 'craps_pass_line', confidence: 1.0 }`.

But the `processVoiceCommand` thunk in `casino-ruleset.ts` had NO routing block for craps intents. The parsed intent was silently dropped — no error, no action, just nothing happened.

## Why It Was Missed

The parser and the router are in different files (`voice/parseVoiceIntent.ts` vs `ruleset/casino-ruleset.ts`). The developer who added the parser patterns didn't check the routing side. No test verified end-to-end voice → action for craps.

## The Fix

Added a craps routing block in `processVoiceCommand` that dispatches craps reducers during craps phases (come-out betting, point betting, roll phases).

## Rule

> **Voice commands require TWO things: parsing + routing.** Adding an intent to the parser without adding routing in `processVoiceCommand` creates a silent failure — the intent is recognised but never acted upon. When adding intents for a new game:
> 1. Add patterns to `parseVoiceIntent.ts`
> 2. Add the intent type to the `VoiceIntent` union
> 3. Add routing in `processVoiceCommand` with phase guards
> 4. Write an end-to-end test: voice transcript → game action dispatched

> **Grep for the dispatch side** whenever you add new intent types: `grep -r processVoiceCommand` to find where routing happens.
