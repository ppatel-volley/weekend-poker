# Weekend Casino — Team Kickoff Questions

> **Status:** Awaiting Answers
> **Date:** 2026-02-28
> **From:** Tech Lead (Principal Engineer)
> **To:** Product / Engineering Leadership
>
> Please answer inline by replacing the `[ ]` with your choice or typing your answer after the arrow (→).

---

## Already Answered (Round 1)

These are recorded for the team's reference — no action needed.

| # | Question | Answer |
|---|----------|--------|
| 1 | Start with v1 or v2? | Base architecture first, then all poker variants |
| 2 | Existing codebase? | Existing poker code can be replaced/rewritten as needed |
| 3 | VGF access? | Available at `c:\volley\dev\vgf` and as node package |
| 4 | Team composition? | Approved as proposed |
| 5 | External services? | Mock everything except Deepgram |
| 6 | 3D assets? | Use placeholders for now |
| 7 | Branching strategy? | Approved as proposed |
| 8 | Game order? | Poker variants first, then blackjack |
| 9 | Learnings? | Team must create/update learnings files on mistakes |

---

## Open Questions (Round 2)

### Q10 — Deepgram API Key

You said mock everything except Deepgram.

- **Q10a:** Can you provide the API key now, or should we mock and swap later?
A: Key provided — moved to `.env` (not committed). See `.env.example` for template.

- **Q10b:** Is Deepgram for controller voice recognition (STT) only, or also for the server-side voice pipeline?
A: Deepgram is for translating the user's voice into speech, which we then translate into intent and take actions on the server. 

For example, when the player says "draw," that is translated by Deepgram into text. That goes through to the server, and then we use an agent or something to translate that into an action, which can be called by that agent and perform an action. For example, then it would draw a card and give it to the player.

Let me know if you have more questions around this. 


---

### Q11 — Existing Hold'em Code: Keep or Rewrite?

The existing poker engine has 382 passing tests, clean types, and proper VGF integration. The TDD says Hold'em phases stay unprefixed for backwards compatibility (D-003).

- [X] **(A) Keep** — Build multi-game architecture around existing Hold'em code (faster, lower risk)
- [ ] **(B) Rewrite** — Rebuild Hold'em as part of new casino architecture from scratch (cleaner, higher risk)
- [ ] **(C) Other** →

---

### Q12 — TTS / Dealer Characters

The PRD defines dealer characters with distinct voices. The existing code has a `TTSMessage` type and queue.

- [X] **(A) Mock TTS entirely** — Dealer messages appear as text only, no audio
- [ ] **(B) Integrate a TTS provider now** — If so, which one? →
- [ ] **(C) Other** →

---

### Q13 — AI Bots

The PRD describes "hybrid rules + LLM" bots using Claude. For this first pass:

- [ ] **(A) Rules-based bots only** — No external dependency, faster to ship
- [X] **(B) Rules + Claude integration** — Full bot system from the start
- [ ] **(C) Stub the bot interface** — Define the interface, implement later
- [ ] **(D) Other** →

---

### Q14 — Video Assets System

The PRD describes cinematic video moments (intros, celebrations, transitions). The TDD has a full video playback architecture.

- [ ] **(A) Stub entirely** — No video system, skip for now
- [] **(B) Build architecture with placeholders** — Video pipeline works, just no real videos yet
- [X] **(C) Other** → I'm I'm going to create another agent to build and fetch videos while you are working on the code. 

---

### Q15 — Package Rename Timing

The rebrand changes `@weekend-poker/*` → `@weekend-casino/*`. This touches every file.

- [X] **(A) Rename first** — Clean slate before any feature work (recommended)
- [ ] **(B) Rename later** — Keep poker naming, rebrand in a separate pass
- [ ] **(C) Other** →

---

### Q16 — Test Coverage Target

Existing codebase has excellent coverage. AGENTS.md mandates tests for all new code.

- [ ] **(A) 80%+ coverage** — Solid but pragmatic
- [X] **(B) 90%+ coverage** — High confidence
- [ ] **(C) Just follow AGENTS.md** — Tests for all new code, no specific % target
- [ ] **(D) Other** →

---

### Q17 — Development Environment

- [X] **(A) Dev server must work** — `pnpm dev` should run all three apps (server, display, controller) locally
- [ ] **(B) Focus on codebase** — You'll sort out running it yourself
- [ ] **(C) Other** →

---

## How to Answer

1. Edit this file directly
2. Replace `[ ]` with `[x]` for your choice, or type your answer after the `→`
3. Save and let me know when you're done

Once these are answered, the team kicks off immediately.
