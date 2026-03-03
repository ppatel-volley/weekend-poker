import { describe, it, expect } from 'vitest'
import { PokerPhase, DEFAULT_BLIND_LEVEL } from '@weekend-casino/shared'
import { createInitialState } from '../ruleset/index.js'

describe('createInitialState', () => {
  const state = createInitialState()

  // ── Phase ──────────────────────────────────────────────────

  it('should start in the Lobby phase', () => {
    expect(state.phase).toBe(PokerPhase.Lobby)
  })

  // ── Table configuration ────────────────────────────────────

  it('should use the default blind level', () => {
    expect(state.blindLevel).toEqual(DEFAULT_BLIND_LEVEL)
  })

  it('should default to vincent as dealer character', () => {
    expect(state.dealerCharacterId).toBe('vincent')
  })

  it('should have a 3-second inter-hand delay', () => {
    expect(state.interHandDelaySec).toBe(3)
  })

  it('should have autoFillBots enabled', () => {
    expect(state.autoFillBots).toBe(true)
  })

  // ── Hand state ─────────────────────────────────────────────

  it('should start at hand number 0', () => {
    expect(state.handNumber).toBe(0)
  })

  it('should start with dealerIndex at 0', () => {
    expect(state.dealerIndex).toBe(0)
  })

  it('should start with no active player', () => {
    expect(state.activePlayerIndex).toBe(-1)
  })

  it('should start with an empty players array', () => {
    expect(state.players).toEqual([])
    expect(state.players).toHaveLength(0)
  })

  it('should start with no community cards', () => {
    expect(state.communityCards).toEqual([])
    expect(state.communityCards).toHaveLength(0)
  })

  it('should start with pot at zero', () => {
    expect(state.pot).toBe(0)
  })

  it('should start with no side pots', () => {
    expect(state.sidePots).toEqual([])
  })

  it('should start with currentBet at zero', () => {
    expect(state.currentBet).toBe(0)
  })

  it('should set minRaiseIncrement to the big blind', () => {
    expect(state.minRaiseIncrement).toBe(DEFAULT_BLIND_LEVEL.bigBlind)
  })

  // ── Hand history ───────────────────────────────────────────

  it('should start with empty hand history', () => {
    expect(state.handHistory).toEqual([])
  })

  it('should start with no last aggressor', () => {
    expect(state.lastAggressor).toBeNull()
  })

  // ── Dealing state ──────────────────────────────────────────

  it('should start with dealing not complete', () => {
    expect(state.dealingComplete).toBe(false)
  })

  // ── Dealer display ─────────────────────────────────────────

  it('should start with no dealer message', () => {
    expect(state.dealerMessage).toBeNull()
  })

  // ── TTS queue ──────────────────────────────────────────────

  it('should start with an empty TTS queue', () => {
    expect(state.ttsQueue).toEqual([])
  })

  // ── Session stats ──────────────────────────────────────────
  // The initial casino state uses poker-shaped session stats for backward compat.
  // Access via index signature since the TS type is CasinoGameState.sessionStats.

  it('should initialise session stats correctly', () => {
    const stats = state.sessionStats as any
    expect(stats.handsPlayed).toBe(0)
    expect(stats.totalPotDealt).toBe(0)
    expect(stats.startedAt).toBeGreaterThan(0)
    expect(stats.playerStats).toEqual({})
    expect(stats.largestPot).toBeNull()
    expect(stats.biggestBluff).toBeNull()
    expect(stats.worstBeat).toBeNull()
  })

  it('should set startedAt to approximately the current time', () => {
    const stats = state.sessionStats as any
    const now = Date.now()
    // Allow a generous 5-second window for test execution
    expect(stats.startedAt).toBeGreaterThan(now - 5000)
    expect(stats.startedAt).toBeLessThanOrEqual(now)
  })
})
