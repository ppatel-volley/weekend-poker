# Learning 011: Weekly challenge backfill must NOT use lifetime stats

**Date**: 2026-03-03
**Context**: Fixing challenge progress loss when player plays before opening Challenges tab
**Severity**: High

## What Happened

Weekly challenges are assigned lazily on first API call (`GET /api/challenges/:deviceToken`). If a player plays 5 hands before opening the Challenges tab, those hands don't count because challenges didn't exist yet.

A "backfill" function was added to `assignChallenges()` that checked the player's `PersistentPlayerStats` (lifetime counters like `totalHandsPlayed`, `totalHandsWon`, `bestWinStreak`) and set initial `currentValue` based on those stats.

## Why It Was Wrong

Lifetime stats are cumulative across ALL weeks. A returning player with `totalHandsPlayed = 500` would instantly complete a "Play 5 hands" weekly challenge without playing a single hand that week. This:
- Breaks the retention intent ("play this week to earn rewards")
- Allows passive weekly reward farming
- Defeats the purpose of a weekly cadence

## The Fix

Removed the backfill entirely. Weekly challenges start at `currentValue: 0` and only count events that happen after assignment.

## Correct Alternative (TODO)

To avoid losing early-hand progress without using lifetime stats:
1. **Proactive assignment**: Assign challenges when the player joins a session (not lazily on first API call)
2. **Time-bounded backfill**: Store `assignedAt` timestamp, then only count events after that timestamp — but this requires per-event timestamps, not aggregate counters
3. **Weekly-bucketed counters**: Track stats per-week separately from lifetime stats

## Rule

> **Never use lifetime/cumulative stats to initialise time-bounded challenges.** Weekly challenges must only count activity within the challenge period. If you can't determine what happened "this week" vs "all time," start at zero.
