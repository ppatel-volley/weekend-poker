/**
 * Tests for v2.0 Speed Config, Quick-Play Mode, and Casino Crawl reducers.
 */
import { describe, it, expect } from 'vitest'
import {
  createInitialCasinoState,
  casinoSetSpeedConfig,
  casinoClearSpeedConfig,
  casinoEnableQuickPlay,
  casinoDisableQuickPlay,
  casinoQuickPlayIncrementHand,
  casinoQuickPlayRecordGameSwitch,
  casinoStartCasinoCrawl,
  casinoAdvanceCasinoCrawl,
  casinoStopCasinoCrawl,
} from '../ruleset/casino-state.js'
import type { CasinoGame } from '@weekend-casino/shared'
import {
  DEFAULT_SPEED_CONFIG,
  SPEED_HOLDEM_CONFIG,
  SPEED_DRAW_CONFIG,
  SPEED_BLACKJACK_CONFIG,
  DEFAULT_QUICK_PLAY_CONFIG,
  DEFAULT_CASINO_CRAWL_CONFIG,
} from '@weekend-casino/shared'

describe('SpeedConfig', () => {
  describe('shared type defaults', () => {
    it('DEFAULT_SPEED_CONFIG has disabled=false', () => {
      expect(DEFAULT_SPEED_CONFIG.enabled).toBe(false)
      expect(DEFAULT_SPEED_CONFIG.actionTimerSeconds).toBe(30)
      expect(DEFAULT_SPEED_CONFIG.autoFoldOnTimeout).toBe(false)
      expect(DEFAULT_SPEED_CONFIG.autoStandOnHard17).toBe(false)
      expect(DEFAULT_SPEED_CONFIG.autoBlindsIncreaseEvery).toBe(0)
      expect(DEFAULT_SPEED_CONFIG.fastAnimations).toBe(false)
      expect(DEFAULT_SPEED_CONFIG.drawTimerSeconds).toBe(30)
    })

    it('SPEED_HOLDEM_CONFIG has correct values', () => {
      expect(SPEED_HOLDEM_CONFIG.enabled).toBe(true)
      expect(SPEED_HOLDEM_CONFIG.actionTimerSeconds).toBe(10)
      expect(SPEED_HOLDEM_CONFIG.autoFoldOnTimeout).toBe(true)
      expect(SPEED_HOLDEM_CONFIG.autoBlindsIncreaseEvery).toBe(5)
      expect(SPEED_HOLDEM_CONFIG.fastAnimations).toBe(true)
    })

    it('SPEED_DRAW_CONFIG has correct values', () => {
      expect(SPEED_DRAW_CONFIG.enabled).toBe(true)
      expect(SPEED_DRAW_CONFIG.actionTimerSeconds).toBe(15)
      expect(SPEED_DRAW_CONFIG.autoFoldOnTimeout).toBe(true)
      expect(SPEED_DRAW_CONFIG.drawTimerSeconds).toBe(10)
      expect(SPEED_DRAW_CONFIG.fastAnimations).toBe(true)
    })

    it('SPEED_BLACKJACK_CONFIG has correct values', () => {
      expect(SPEED_BLACKJACK_CONFIG.enabled).toBe(true)
      expect(SPEED_BLACKJACK_CONFIG.actionTimerSeconds).toBe(10)
      expect(SPEED_BLACKJACK_CONFIG.autoStandOnHard17).toBe(true)
      expect(SPEED_BLACKJACK_CONFIG.autoFoldOnTimeout).toBe(false)
      expect(SPEED_BLACKJACK_CONFIG.fastAnimations).toBe(true)
    })
  })

  describe('setSpeedConfig reducer', () => {
    it('sets speed config on state', () => {
      const state = createInitialCasinoState()
      const result = casinoSetSpeedConfig(state, SPEED_HOLDEM_CONFIG)
      expect(result.speedConfig).toEqual(SPEED_HOLDEM_CONFIG)
    })

    it('replaces existing speed config', () => {
      const state = createInitialCasinoState({ speedConfig: SPEED_HOLDEM_CONFIG } as any)
      const result = casinoSetSpeedConfig(state, SPEED_BLACKJACK_CONFIG)
      expect(result.speedConfig).toEqual(SPEED_BLACKJACK_CONFIG)
    })

    it('does not mutate original state', () => {
      const state = createInitialCasinoState()
      casinoSetSpeedConfig(state, SPEED_HOLDEM_CONFIG)
      expect(state.speedConfig).toBeUndefined()
    })
  })

  describe('clearSpeedConfig reducer', () => {
    it('removes speed config from state', () => {
      const state = createInitialCasinoState({ speedConfig: SPEED_HOLDEM_CONFIG } as any)
      const result = casinoClearSpeedConfig(state)
      expect(result.speedConfig).toBeUndefined()
    })

    it('is safe to call when no speed config exists', () => {
      const state = createInitialCasinoState()
      const result = casinoClearSpeedConfig(state)
      expect(result.speedConfig).toBeUndefined()
    })
  })

  describe('backwards compatibility', () => {
    it('initial state has no speedConfig by default', () => {
      const state = createInitialCasinoState()
      expect(state.speedConfig).toBeUndefined()
    })

    it('existing game logic is unaffected when speedConfig is absent', () => {
      const state = createInitialCasinoState()
      expect(state.phase).toBe('LOBBY')
      expect(state.players).toEqual([])
      expect(state.wallet).toEqual({})
    })
  })
})

describe('QuickPlayMode', () => {
  describe('enableQuickPlay reducer', () => {
    it('enables quick-play mode with defaults', () => {
      const state = createInitialCasinoState()
      const result = casinoEnableQuickPlay(state)
      expect(result.quickPlayMode).toBeDefined()
      expect(result.quickPlayMode!.enabled).toBe(true)
      expect(result.quickPlayMode!.rotationIntervalHands).toBe(10)
      expect(result.quickPlayMode!.currentHandCount).toBe(0)
      expect(result.quickPlayMode!.gamesPlayed).toEqual([])
    })

    it('records current game in history when enabling', () => {
      const state = createInitialCasinoState({ selectedGame: 'holdem' as CasinoGame })
      const result = casinoEnableQuickPlay(state)
      expect(result.quickPlayMode!.gamesPlayed).toEqual(['holdem'])
    })
  })

  describe('disableQuickPlay reducer', () => {
    it('removes quick-play mode from state', () => {
      const state = createInitialCasinoState()
      const enabled = casinoEnableQuickPlay(state)
      const result = casinoDisableQuickPlay(enabled)
      expect(result.quickPlayMode).toBeUndefined()
    })
  })

  describe('quickPlayIncrementHand reducer', () => {
    it('increments hand counter', () => {
      const state = createInitialCasinoState()
      const enabled = casinoEnableQuickPlay(state)
      const result = casinoQuickPlayIncrementHand(enabled)
      expect(result.quickPlayMode!.currentHandCount).toBe(1)
    })

    it('increments multiple times', () => {
      let state = casinoEnableQuickPlay(createInitialCasinoState())
      state = casinoQuickPlayIncrementHand(state)
      state = casinoQuickPlayIncrementHand(state)
      state = casinoQuickPlayIncrementHand(state)
      expect(state.quickPlayMode!.currentHandCount).toBe(3)
    })

    it('no-ops when quick-play is not enabled', () => {
      const state = createInitialCasinoState()
      const result = casinoQuickPlayIncrementHand(state)
      expect(result.quickPlayMode).toBeUndefined()
    })
  })

  describe('quickPlayRecordGameSwitch reducer', () => {
    it('records game and resets hand counter', () => {
      let state = casinoEnableQuickPlay(createInitialCasinoState({ selectedGame: 'holdem' as CasinoGame }))
      state = casinoQuickPlayIncrementHand(state)
      state = casinoQuickPlayIncrementHand(state)
      state = casinoQuickPlayRecordGameSwitch(state, 'blackjack_classic')
      expect(state.quickPlayMode!.currentHandCount).toBe(0)
      expect(state.quickPlayMode!.gamesPlayed).toEqual(['holdem', 'blackjack_classic'])
    })

    it('no-ops when quick-play is not enabled', () => {
      const state = createInitialCasinoState()
      const result = casinoQuickPlayRecordGameSwitch(state, 'holdem')
      expect(result.quickPlayMode).toBeUndefined()
    })
  })

  describe('backwards compatibility', () => {
    it('initial state has no quickPlayMode by default', () => {
      const state = createInitialCasinoState()
      expect(state.quickPlayMode).toBeUndefined()
    })
  })
})

describe('CasinoCrawl', () => {
  const testGames: CasinoGame[] = ['holdem', 'blackjack_classic', 'five_card_draw']

  describe('startCasinoCrawl reducer', () => {
    it('activates crawl with provided game order', () => {
      const state = createInitialCasinoState()
      const result = casinoStartCasinoCrawl(state, testGames, 5)
      expect(result.casinoCrawl).toBeDefined()
      expect(result.casinoCrawl!.active).toBe(true)
      expect(result.casinoCrawl!.gamesOrder).toEqual(testGames)
      expect(result.casinoCrawl!.currentIndex).toBe(0)
      expect(result.casinoCrawl!.roundsPerGame).toBe(5)
      expect(result.casinoCrawl!.roundsPlayed).toBe(0)
    })

    it('sets selectedGame to first game in order', () => {
      const state = createInitialCasinoState()
      const result = casinoStartCasinoCrawl(state, testGames, 5)
      expect(result.selectedGame).toBe('holdem')
    })

    it('defaults roundsPerGame to 5 when given 0', () => {
      const state = createInitialCasinoState()
      const result = casinoStartCasinoCrawl(state, testGames, 0)
      expect(result.casinoCrawl!.roundsPerGame).toBe(5)
    })

    it('respects custom roundsPerGame', () => {
      const state = createInitialCasinoState()
      const result = casinoStartCasinoCrawl(state, testGames, 3)
      expect(result.casinoCrawl!.roundsPerGame).toBe(3)
    })
  })

  describe('advanceCasinoCrawl reducer', () => {
    it('increments roundsPlayed within current game', () => {
      let state = casinoStartCasinoCrawl(createInitialCasinoState(), testGames, 5)
      state = casinoAdvanceCasinoCrawl(state)
      expect(state.casinoCrawl!.roundsPlayed).toBe(1)
      expect(state.casinoCrawl!.currentIndex).toBe(0)
      expect(state.selectedGame).toBe('holdem')
    })

    it('switches to next game when roundsPerGame reached', () => {
      let state = casinoStartCasinoCrawl(createInitialCasinoState(), testGames, 2)
      state = casinoAdvanceCasinoCrawl(state) // round 1
      state = casinoAdvanceCasinoCrawl(state) // round 2 -> switch
      expect(state.casinoCrawl!.currentIndex).toBe(1)
      expect(state.casinoCrawl!.roundsPlayed).toBe(0)
      expect(state.selectedGame).toBe('blackjack_classic')
    })

    it('deactivates crawl when all games complete', () => {
      let state = casinoStartCasinoCrawl(createInitialCasinoState(), testGames, 1)
      state = casinoAdvanceCasinoCrawl(state) // holdem done -> switch to bj
      state = casinoAdvanceCasinoCrawl(state) // bj done -> switch to draw
      state = casinoAdvanceCasinoCrawl(state) // draw done -> crawl complete
      expect(state.casinoCrawl!.active).toBe(false)
    })

    it('progresses correctly through full rotation', () => {
      let state = casinoStartCasinoCrawl(createInitialCasinoState(), testGames, 2)

      // Game 1: holdem, 2 rounds
      expect(state.selectedGame).toBe('holdem')
      state = casinoAdvanceCasinoCrawl(state)
      expect(state.casinoCrawl!.roundsPlayed).toBe(1)
      state = casinoAdvanceCasinoCrawl(state) // switch
      expect(state.selectedGame).toBe('blackjack_classic')

      // Game 2: blackjack, 2 rounds
      state = casinoAdvanceCasinoCrawl(state)
      expect(state.casinoCrawl!.roundsPlayed).toBe(1)
      state = casinoAdvanceCasinoCrawl(state) // switch
      expect(state.selectedGame).toBe('five_card_draw')

      // Game 3: draw, 2 rounds
      state = casinoAdvanceCasinoCrawl(state)
      expect(state.casinoCrawl!.roundsPlayed).toBe(1)
      state = casinoAdvanceCasinoCrawl(state) // complete
      expect(state.casinoCrawl!.active).toBe(false)
    })

    it('no-ops when crawl is not active', () => {
      const state = createInitialCasinoState()
      const result = casinoAdvanceCasinoCrawl(state)
      expect(result).toBe(state) // identity — no mutation
    })
  })

  describe('stopCasinoCrawl reducer', () => {
    it('removes crawl config from state', () => {
      let state = casinoStartCasinoCrawl(createInitialCasinoState(), testGames, 5)
      state = casinoStopCasinoCrawl(state)
      expect(state.casinoCrawl).toBeUndefined()
    })

    it('is safe when no crawl exists', () => {
      const state = createInitialCasinoState()
      const result = casinoStopCasinoCrawl(state)
      expect(result.casinoCrawl).toBeUndefined()
    })
  })

  describe('backwards compatibility', () => {
    it('initial state has no casinoCrawl by default', () => {
      const state = createInitialCasinoState()
      expect(state.casinoCrawl).toBeUndefined()
    })
  })
})

describe('shared type constants', () => {
  it('DEFAULT_QUICK_PLAY_CONFIG is disabled with sensible defaults', () => {
    expect(DEFAULT_QUICK_PLAY_CONFIG.enabled).toBe(false)
    expect(DEFAULT_QUICK_PLAY_CONFIG.rotationIntervalHands).toBe(10)
    expect(DEFAULT_QUICK_PLAY_CONFIG.currentHandCount).toBe(0)
    expect(DEFAULT_QUICK_PLAY_CONFIG.gamesPlayed).toEqual([])
  })

  it('DEFAULT_CASINO_CRAWL_CONFIG is inactive with sensible defaults', () => {
    expect(DEFAULT_CASINO_CRAWL_CONFIG.active).toBe(false)
    expect(DEFAULT_CASINO_CRAWL_CONFIG.gamesOrder).toEqual([])
    expect(DEFAULT_CASINO_CRAWL_CONFIG.currentIndex).toBe(0)
    expect(DEFAULT_CASINO_CRAWL_CONFIG.roundsPerGame).toBe(5)
    expect(DEFAULT_CASINO_CRAWL_CONFIG.roundsPlayed).toBe(0)
  })
})
