import { describe, it, expect } from 'vitest'
import { CasinoPhase } from '@weekend-casino/shared'
import type { CasinoGameState } from '@weekend-casino/shared'
import { createInitialCasinoState } from '../ruleset/casino-state.js'
import { wrapWithGameNightCheck } from '../ruleset/game-night-utils.js'

function makeCtx(stateOverrides: Partial<CasinoGameState> = {}) {
  const state = createInitialCasinoState(stateOverrides)
  return {
    session: { state },
    getState: () => state,
  }
}

describe('wrapWithGameNightCheck', () => {
  const innerNext = (_ctx: any) => CasinoPhase.PostingBlinds

  it('should call innerNext when gameNight is undefined (v2.0 no-op)', () => {
    const wrapped = wrapWithGameNightCheck(innerNext)
    const ctx = makeCtx()
    expect(ctx.session.state.gameNight).toBeUndefined()
    expect(wrapped(ctx)).toBe(CasinoPhase.PostingBlinds)
  })

  it('should call innerNext when gameNight is null', () => {
    const wrapped = wrapWithGameNightCheck(innerNext)
    const ctx = makeCtx({ gameNight: null as any })
    expect(wrapped(ctx)).toBe(CasinoPhase.PostingBlinds)
  })

  it('should call innerNext when gameNight.active is false', () => {
    const wrapped = wrapWithGameNightCheck(innerNext)
    const ctx = makeCtx({
      gameNight: {
        active: false,
        roundLimit: 5,
        roundsPlayed: 10,
        scores: {},
      },
    })
    expect(wrapped(ctx)).toBe(CasinoPhase.PostingBlinds)
  })

  it('should call innerNext when rounds played < round limit', () => {
    const wrapped = wrapWithGameNightCheck(innerNext)
    const ctx = makeCtx({
      gameNight: {
        active: true,
        roundLimit: 5,
        roundsPlayed: 3,
        scores: {},
      },
    })
    expect(wrapped(ctx)).toBe(CasinoPhase.PostingBlinds)
  })

  it('should return GN_LEADERBOARD when active and rounds >= limit', () => {
    const wrapped = wrapWithGameNightCheck(innerNext)
    const ctx = makeCtx({
      gameNight: {
        active: true,
        roundLimit: 5,
        roundsPlayed: 5,
        scores: { 'p1': 100, 'p2': 70 },
      },
    })
    expect(wrapped(ctx)).toBe(CasinoPhase.GnLeaderboard)
  })

  it('should return GN_LEADERBOARD when rounds > limit (overflow)', () => {
    const wrapped = wrapWithGameNightCheck(innerNext)
    const ctx = makeCtx({
      gameNight: {
        active: true,
        roundLimit: 3,
        roundsPlayed: 7,
        scores: {},
      },
    })
    expect(wrapped(ctx)).toBe(CasinoPhase.GnLeaderboard)
  })

  it('should preserve innerNext logic for different games', () => {
    // Test with a Draw innerNext
    const drawInnerNext = (ctx: any) => {
      const state: CasinoGameState = ctx.session.state
      if (state.gameChangeRequested) return CasinoPhase.GameSelect
      return CasinoPhase.DrawPostingBlinds
    }

    const wrapped = wrapWithGameNightCheck(drawInnerNext)

    // Without Game Night — normal flow
    const ctx1 = makeCtx({ gameChangeRequested: false })
    expect(wrapped(ctx1)).toBe(CasinoPhase.DrawPostingBlinds)

    // Without Game Night — game change requested
    const ctx2 = makeCtx({ gameChangeRequested: true })
    expect(wrapped(ctx2)).toBe(CasinoPhase.GameSelect)

    // With Game Night active and at limit — override to leaderboard
    const ctx3 = makeCtx({
      gameChangeRequested: true,
      gameNight: { active: true, roundLimit: 3, roundsPlayed: 3, scores: {} },
    })
    expect(wrapped(ctx3)).toBe(CasinoPhase.GnLeaderboard)
  })

  it('should work with ctx.session.state (VGF IGameActionContext)', () => {
    // VGF 4.8.0: `next` receives IGameActionContext which always has ctx.session.state.
    // There is no getState() on this context type — see learnings/009.
    const state = createInitialCasinoState({
      gameNight: { active: true, roundLimit: 2, roundsPlayed: 2, scores: {} },
    })
    const ctx = { session: { state } }
    const wrapped = wrapWithGameNightCheck(innerNext)
    expect(wrapped(ctx)).toBe(CasinoPhase.GnLeaderboard)
  })
})
