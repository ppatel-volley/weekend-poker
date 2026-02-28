# Playtester Feedback Report #001

> **Date:** 2026-02-28
> **Reviewer:** Casual playtester (32yo, weekly game nights, casual casino experience)
> **Build:** Post Phase 3 (Hold'em, 5-Card Draw, TCP complete; BJ in progress)
> **Status:** Awaiting PM review

---

## Top Priority Issues (PM to triage)

1. **QR code on TV lobby is placeholder** — joining from the couch is impossible without it
2. **Raw phase names shown to players** — `PREFLOP_BETTING` instead of "Pre-Flop"
3. **5-Card Draw controller doesn't show actual card values** — can't decide what to discard
4. **No way to switch games mid-session** — `gameChangeRequested` exists but no UI trigger
5. **"Stand Pat" label** — poker jargon, should be "Keep All Cards"
6. **All action buttons visible at once in 5-Card Draw** — unlike Hold'em's context-sensitive buttons
7. **No voice feedback confirmation** — "did it hear me?"
8. **"Hit me" not recognised** — most common casual Blackjack phrase
9. **No tutorial or rules summary per game**
10. **No hand strength indicator** — "You have: Pair of Kings"

## Quick Wins Identified

- Phase name lookup table (30 min fix)
- "RAISE TO $X" on raise button
- Hide illegal action buttons in Draw
- Game descriptions in lobby grid
- "Dealer needs Queen-high" on TCP results
- Add casual voice phrases: "hit me", "deal me in", "I'm out", "gimme a card"

## Strengths Noted

- Lobby join flow (simple, fast)
- Hold'em betting controls (colour-coded, slider)
- TCP phased controller layout (ante → decision → results)
- Push-to-talk voice button
- Session timer in HUD
- TCP "PLAY $25" showing cost on button

## Full Report

See teammate message from playtester agent (2026-02-28) for complete LOVE IT / CONFUSED / FRUSTRATED / MISSING / SUGGESTIONS breakdown.
