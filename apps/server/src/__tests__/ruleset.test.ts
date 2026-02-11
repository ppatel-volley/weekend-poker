import { describe, it, expect } from 'vitest'
import { PokerPhase } from '@weekend-poker/shared'
import { pokerRuleset, createInitialState } from '../ruleset/index.js'

describe('pokerRuleset', () => {
  // ── Setup ──────────────────────────────────────────────────

  it('should have a setup function that returns a valid initial state', () => {
    expect(pokerRuleset.setup).toBeDefined()
    expect(typeof pokerRuleset.setup).toBe('function')

    const state = pokerRuleset.setup()
    expect(state).toBeDefined()
    expect(state.phase).toBe(PokerPhase.Lobby)
  })

  // ── Reducers ───────────────────────────────────────────────

  it('should define all expected global reducers', () => {
    const expectedReducers = [
      'updatePlayerBet',
      'foldPlayer',
      'dealCommunityCards',
      'rotateDealerButton',
      'updatePot',
      'awardPot',
      'setActivePlayer',
      'markPlayerDisconnected',
      'markPlayerReconnected',
      'updatePlayerName',
      'updateDealerCharacter',
      'updateBlindLevel',
      'addBotPlayer',
      'removeBotPlayer',
      'updateEmotionalState',
      'updateOpponentProfile',
      'setPlayerLastAction',
      'updateSessionHighlights',
      'enqueueTTSMessage',
      'markDealingComplete',
    ]

    for (const name of expectedReducers) {
      expect(pokerRuleset.reducers).toHaveProperty(name)
      expect(typeof (pokerRuleset.reducers as Record<string, unknown>)[name]).toBe('function')
    }
  })

  it('should have reducers that return new state (implemented)', () => {
    const state = createInitialState()
    const markDealingComplete = pokerRuleset.reducers['markDealingComplete']!
    const result = markDealingComplete(state)
    expect(result).not.toBe(state)
    expect(result.dealingComplete).toBe(true)
  })

  // ── Thunks ─────────────────────────────────────────────────

  it('should define all expected global thunks', () => {
    const expectedThunks = [
      'processPlayerAction',
      'processVoiceCommand',
      'startHand',
      'evaluateHands',
      'distributePot',
      'botDecision',
      'autoFoldPlayer',
      'requestTTS',
      'handleRebuy',
      'sitOutPlayer',
      'dealInPlayer',
      'endSession',
    ]

    for (const name of expectedThunks) {
      expect(pokerRuleset.thunks).toHaveProperty(name)
      expect(typeof (pokerRuleset.thunks as Record<string, unknown>)[name]).toBe('function')
    }
  })

  // ── Phases ─────────────────────────────────────────────────

  it('should define all 14 poker phases', () => {
    const expectedPhases = Object.values(PokerPhase)
    for (const phase of expectedPhases) {
      expect(pokerRuleset.phases).toHaveProperty(phase)
    }
  })

  it('should have 14 phases in total', () => {
    const phaseKeys = Object.keys(pokerRuleset.phases)
    expect(phaseKeys).toHaveLength(14)
  })

  it('each phase should have reducers, thunks, onBegin, endIf, and next', () => {
    for (const [phaseName, phase] of Object.entries(pokerRuleset.phases)) {
      expect(phase, `${phaseName} missing reducers`).toHaveProperty('reducers')
      expect(phase, `${phaseName} missing thunks`).toHaveProperty('thunks')
      expect(phase, `${phaseName} missing onBegin`).toHaveProperty('onBegin')
      expect(phase, `${phaseName} missing endIf`).toHaveProperty('endIf')
      expect(phase, `${phaseName} missing next`).toHaveProperty('next')
    }
  })

  // ── Connection handlers ────────────────────────────────────

  it('should have onConnect and onDisconnect handlers', () => {
    expect(pokerRuleset.onConnect).toBeDefined()
    expect(typeof pokerRuleset.onConnect).toBe('function')
    expect(pokerRuleset.onDisconnect).toBeDefined()
    expect(typeof pokerRuleset.onDisconnect).toBe('function')
  })

  // ── Actions (deprecated) ───────────────────────────────────

  it('should export an empty actions object (deprecated in VGF v4)', () => {
    expect(pokerRuleset.actions).toBeDefined()
    expect(Object.keys(pokerRuleset.actions as Record<string, unknown>)).toHaveLength(0)
  })
})
