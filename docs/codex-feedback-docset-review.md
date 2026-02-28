# Codex Feedback — Full Docs Folder Review (Latest Pass)

Date: 2026-02-28  
Scope: Follow-up conformance review across active casino docs, focused on authority hierarchy, release timing, KPI alignment, and asset-count consistency.

---

## Findings

### High

#### 1) Canonical DAU decision is now underspecified relative to roadmap's phased targets

- `docs/CANONICAL-DECISIONS.md` D-017 still reads as if v2 has a single DAU target (`200-500K`).
- `docs/CASINO-V2-ROADMAP-FINAL.md` now explicitly uses phased targets:
  - 6-month milestone: `50-100K DAU`
  - later-stage upside: `200-500K DAU`

Why this is high:
- Teams can interpret KPI success criteria differently depending on which doc they read first.
- Canonical decisions should be the clearest and most explicit source for cross-doc KPI interpretation.

Recommended fix:
- Rewrite D-017 to encode phased v2 KPI targets explicitly (milestone vs full-v2 lifecycle), matching roadmap language.

---

#### 2) Per-game v2 video count decomposition mismatch between architecture and game-design docs

- `docs/CASINO-TDD-architecture.md` still uses:
  - `v2.0: +9 Roulette +6 TCP +6 shared v2`
- `docs/CASINO-V2-NEW-GAMES.md` uses:
  - `v2.0: 11 Roulette +9 TCP +1 TCP intro`

Why this is high:
- Even if cumulative totals align, production planning (ownership by game, sequencing, QA checklists, asset pipeline staffing) depends on per-game decomposition.

Recommended fix:
- Align `CASINO-TDD-architecture.md` Section 4.4 comments/count model to exactly match `CASINO-V2-NEW-GAMES.md` Section 28.

---

### Medium

#### 3) Authority model is mostly fixed but still too prose-heavy

- Major authority conflict is resolved (`CASINO-V2-PRD.md` now defers release scope/timing to roadmap).
- Residual risk remains because authority boundaries are expressed across multiple paragraphs in multiple docs rather than one compact matrix.

Why this is medium:
- Future edits can drift if there is no single, concise authority-by-domain map.

Recommended fix:
- Add a compact "authority matrix" table in `docs/CANONICAL-DECISIONS.md`:
  - Document
  - Authoritative domains
  - Non-authoritative domains
  - Escalation on conflict

---

## What Improved Since Prior Pass

1. Legacy docs now carry clear superseded banners (`PRD.md`, `TDD-frontend.md`, `TDD-backend.md`, `TDD-architecture.md`).
2. `CASINO-V2-PRD.md` authority language is corrected and aligned with roadmap/canonical hierarchy.
3. `CASINO-TDD-frontend.md` cumulative asset totals now match the active v2 numbers (`72` / `84`).

---

## Next Edits (Small and Final)

1. Update D-017 in `CANONICAL-DECISIONS.md` to explicitly represent phased v2 DAU targets.
2. Update per-game v2 asset decomposition in `CASINO-TDD-architecture.md` to match `CASINO-V2-NEW-GAMES.md`.
3. Add a one-table authority matrix in `CANONICAL-DECISIONS.md` to reduce interpretation drift.

---

## Final Assessment

The docset is now largely execution-safe. Remaining issues are narrow and governance-oriented, not structural.  
Addressing the three edits above should fully close the current documentation risk profile.
