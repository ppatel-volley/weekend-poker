# Learning 002: TDD Spec Drift — Shadow Map Type

**Date:** February 2026
**Category:** Three.js, Performance
**Severity:** Medium

## The Mistake

`GameView.tsx` was written with `PCFSoftShadowMap` instead of the TDD-specified `PCFShadowMap`. The TDD (Section 8.2) explicitly states:

> Only the key light (pendant spotlight) casts shadows. Shadow map resolution: 1024x1024 with PCFShadowMap (not PCFSoftShadowMap, which is more expensive).

## Why This Is Wrong

`PCFSoftShadowMap` is more GPU-intensive than `PCFShadowMap`. On the target hardware (GameLift Streams cloud GPU), the difference is marginal, but it violates the performance budget philosophy and the explicit TDD requirement.

## The Correct Process

1. When implementing rendering configuration, copy exact values from the TDD.
2. Cross-check shadow type, resolution, bias values against the TDD performance section.
3. If you believe a different setting is better, flag it as a deviation and justify it.

## Red Flags to Watch For

- Any Three.js configuration that sounds "better" than what the TDD specifies
- Shadow map types, tone mapping modes, or anti-aliasing settings that differ from spec
- Performance-related constants that were "upgraded" without explicit justification

## Prevention

- Treat TDD rendering config as a contract, not a suggestion.
- When writing rendering setup code, have the TDD performance section open for reference.
