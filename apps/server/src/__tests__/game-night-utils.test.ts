import { describe, it, expect } from 'vitest'
import { CasinoPhase } from '@weekend-casino/shared'
import type { CasinoGameState, GameNightGameState } from '@weekend-casino/shared'
import { createInitialCasinoState } from '../ruleset/casino-state.js'
import { wrapWithGameNightCheck } from '../ruleset/game-night-utils.js'

/** Build a full GameNightGameState from partial overrides. */
function makeGN(overrides: Partial<GameNightGameState> & Pick<GameNightGameState, 'active' | 'roundLimit' | 'roundsPlayed' | 'scores'>): GameNightGameState {
  return {
    gameLineup: [],
    currentGameIndex: 0,
    roundsPerGame: 5,
    playerScores: {},
    gameResults: [],
    theme: 'classic',
    championId: null,
    startedAt: Date.now(),
    leaderboardReady: false,
    championReady: false,
    achievements: [],
    setupConfirmed: false,
    ...overrides,
  }
}

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
      gameNight: makeGN({ active: false, roundLimit: 5, roundsPlayed: 10, scores: {} }),
    })
    expect(wrapped(ctx)).toBe(CasinoPhase.PostingBlinds)
  })

  it('should call innerNext when rounds played < round limit', () => {
    const wrapped = wrapWithGameNightCheck(innerNext)
    const ctx = makeCtx({
      gameNight: makeGN({ active: true, roundLimit: 5, roundsPlayed: 3, scores: {} }),
    })
    expect(wrapped(ctx)).toBe(CasinoPhase.PostingBlinds)
  })

  it('should return GN_LEADERBOARD when active and rounds >= limit', () => {
    const wrapped = wrapWithGameNightCheck(innerNext)
    const ctx = makeCtx({
      gameNight: makeGN({ active: true, roundLimit: 5, roundsPlayed: 5, scores: { 'p1': 100, 'p2': 70 } }),
    })
    expect(wrapped(ctx)).toBe(CasinoPhase.GnLeaderboard)
  })

  it('should return GN_LEADERBOARD when rounds > limit (overflow)', () => {
    const wrapped = wrapWithGameNightCheck(innerNext)
    const ctx = makeCtx({
      gameNight: makeGN({ active: true, roundLimit: 3, roundsPlayed: 7, scores: {} }),
    })
    expect(wrapped(ctx)).toBe(CasinoPhase.GnLeaderboard)
  })

  it('should preserve innerNext logic for different games', () => {
    const drawInnerNext = (ctx: any) => {
      const state: CasinoGameState = ctx.session.state
      if (state.gameChangeRequested) return CasinoPhase.GameSelect
      return CasinoPhase.DrawPostingBlinds
    }

    const wrapped = wrapWithGameNightCheck(drawInnerNext)

    const ctx1 = makeCtx({ gameChangeRequested: false })
    expect(wrapped(ctx1)).toBe(CasinoPhase.DrawPostingBlinds)

    const ctx2 = makeCtx({ gameChangeRequested: true })
    expect(wrapped(ctx2)).toBe(CasinoPhase.GameSelect)

    const ctx3 = makeCtx({
      gameChangeRequested: true,
      gameNight: makeGN({ active: true, roundLimit: 3, roundsPlayed: 3, scores: {} }),
    })
    expect(wrapped(ctx3)).toBe(CasinoPhase.GnLeaderboard)
  })

  it('should work with ctx.session.state (VGF IGameActionContext)', () => {
    const state = createInitialCasinoState({
      gameNight: makeGN({ active: true, roundLimit: 2, roundsPlayed: 2, scores: {} }),
    })
    const ctx = { session: { state } }
    const wrapped = wrapWithGameNightCheck(innerNext)
    expect(wrapped(ctx)).toBe(CasinoPhase.GnLeaderboard)
  })
})
