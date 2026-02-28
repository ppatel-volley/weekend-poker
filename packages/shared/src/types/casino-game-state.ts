import type { CasinoPhase } from './casino-phases.js'
import type { CasinoGame } from './casino-game.js'
import type { CasinoPlayer } from './casino-player.js'
import type { Wallet } from './casino-wallet.js'
import type { SessionStats } from './casino-session-stats.js'
import type { VideoPlayback, BackgroundVideo } from './casino-video.js'
import type { BlindLevel, TTSMessage } from './game-state.js'

/**
 * Root Casino Game State — Multi-game platform unified state (D-002, D-001).
 *
 * CRITICAL DESIGN PATTERNS:
 *   D-002: Flat union base with optional game-specific sub-objects (NOT inheritance)
 *   D-001: Single GameRuleset with phase namespaces (NOT session-per-game)
 *   D-004: CasinoGame enum uses snake_case values
 *   D-005: Shared wallet (10,000 chips starting balance)
 *   D-011: Video state is server-authoritative
 *   D-013: Per-game lazy loading (NOT bulk preload)
 *
 * VGF BaseGameState provides: phase, previousPhase, __vgfStateVersion
 * We re-declare phase as CasinoPhase for type narrowing.
 *
 * State Synchronization:
 *   - Root wallet is updated only at Sync Points (SP1, SP2, SP3)
 *   - During active gameplay, game sub-state balances are live values
 *   - Game switch (GAME_SELECT) clears previous game sub-state
 *   - All state mutations are immutable (VGF enforces via Object.freeze)
 */
export interface CasinoGameState {
  // ───────────────────────────────────────────────────────────────
  // VGF Required
  // ───────────────────────────────────────────────────────────────
  // Index signature required by VGF BaseGameState (extends Record<string, unknown>)
  [key: string]: unknown

  // Phase state (re-declared for type narrowing)
  phase: CasinoPhase
  previousPhase?: CasinoPhase

  // ───────────────────────────────────────────────────────────────
  // Multi-Game Control (D-001, D-008)
  // ───────────────────────────────────────────────────────────────
  selectedGame: CasinoGame | null               // null in lobby/game-select
  gameSelectConfirmed: boolean                  // player confirmed game choice
  gameChangeRequested: boolean                  // v1: host-only (D-008)
  gameChangeVotes: Record<string, CasinoGame>  // v2: vote-based (D-008)

  // ───────────────────────────────────────────────────────────────
  // Shared Wallet (D-005: 10,000 starting balance)
  // ───────────────────────────────────────────────────────────────
  wallet: Wallet                               // playerId -> balance (chips)

  // ───────────────────────────────────────────────────────────────
  // Player Roster
  // ───────────────────────────────────────────────────────────────
  players: CasinoPlayer[]

  // ───────────────────────────────────────────────────────────────
  // Table Configuration
  // ───────────────────────────────────────────────────────────────
  dealerCharacterId: string                    // poker dealers: Vincent, Maya, Remy, Jade
                                                // blackjack dealers: Ace Malone, Scarlett Vega, Chip Dubois
  blindLevel: BlindLevel                       // current blind level (v1: only for Hold'em)
  handNumber: number                           // increments per hand
  dealerIndex: number                          // seat index of current dealer

  // ───────────────────────────────────────────────────────────────
  // Lobby State
  // ───────────────────────────────────────────────────────────────
  lobbyReady: boolean                          // all players seated and ready to start

  // ───────────────────────────────────────────────────────────────
  // Dealer Display / TTS (Text-to-Speech)
  // ───────────────────────────────────────────────────────────────
  dealerMessage: string | null                 // narrative/flavor text
  ttsQueue: TTSMessage[]                       // queued announcements (v1: text-only, no audio)

  // ───────────────────────────────────────────────────────────────
  // Session Tracking (Cross-Game Stats)
  // ───────────────────────────────────────────────────────────────
  sessionStats: SessionStats

  // ───────────────────────────────────────────────────────────────
  // Video Playback (D-011: Server-Authoritative, D-013: Per-Game Lazy Loading)
  // ───────────────────────────────────────────────────────────────
  videoPlayback?: VideoPlayback                 // foreground video state (dealer intro, hand results, etc.)
  backgroundVideo?: BackgroundVideo             // ambient loops (separate from foreground)

  // ───────────────────────────────────────────────────────────────
  // Transient UI State
  // ───────────────────────────────────────────────────────────────
  betError?: {
    playerId: string
    message: string
    clearedAt: number
  }

  // ───────────────────────────────────────────────────────────────
  // v1 Game Sub-States (Only Populated When Active)
  // ───────────────────────────────────────────────────────────────
  holdem?: HoldemGameState
  fiveCardDraw?: FiveCardDrawGameState
  blackjack?: BlackjackGameState
  blackjackCompetitive?: BlackjackCompetitiveGameState

  // ───────────────────────────────────────────────────────────────
  // v2.0 Game Sub-States
  // ───────────────────────────────────────────────────────────────
  roulette?: RouletteGameState
  threeCardPoker?: ThreeCardPokerGameState

  // ───────────────────────────────────────────────────────────────
  // v2.1 Game Sub-States
  // ───────────────────────────────────────────────────────────────
  craps?: CrapsGameState

  // ───────────────────────────────────────────────────────────────
  // v2.1+ Meta-Game Sub-States
  // ───────────────────────────────────────────────────────────────
  gameNight?: GameNightGameState
  quickPlay?: QuickPlayConfig
  jackpot?: ProgressiveJackpot
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Game Sub-State Placeholder Types
// Each will be fully defined in game-specific TDD files.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** v1 Hold'em game state. Defined in TDD-backend.md Section 3. */
export interface HoldemGameState {
  [key: string]: unknown
  // TBD: Will include players, hole cards, community cards, pots, etc.
}

/** v1 5-Card Draw game state. Defined in TDD-backend.md Section 5. */
export interface FiveCardDrawGameState {
  [key: string]: unknown
  // TBD: Will include players, hole cards, draw phase, discards, pots, etc.
}

/** v1 Blackjack Classic game state. Defined in TDD-backend.md Section 6. */
export interface BlackjackGameState {
  [key: string]: unknown
  // TBD: Will include players, hands, dealer hand, shoe, insurance bets, etc.
}

/** v1 Blackjack Competitive game state. Defined in TDD-backend.md Section 7. */
export interface BlackjackCompetitiveGameState {
  [key: string]: unknown
  // TBD: Will include players, hands, dealer hand, sequential turns, etc.
}

/** v2.0 Roulette game state. Defined in TDD-backend.md Section 8. */
export interface RouletteGameState {
  [key: string]: unknown
  // TBD: Will include bets, wheel result, payout, etc.
}

/** v2.0 Three Card Poker game state. Defined in TDD-backend.md Section 9. */
export interface ThreeCardPokerGameState {
  [key: string]: unknown
  // TBD: Will include players, ante/play bets, hands, etc.
}

/** v2.1 Craps game state. Defined in TDD-backend.md Section 10. */
export interface CrapsGameState {
  [key: string]: unknown
  // TBD: Will include shooter, come-out roll, point, bets, etc.
}

/** v2.1 Game Night Mode state. Defined in TDD-backend.md Section 13. */
export interface GameNightGameState {
  [key: string]: unknown
  // TBD: Will include round number, scorecard, game rotation, etc.
}

/** v2.0 Quick Play config (auto-rotating games). */
export interface QuickPlayConfig {
  enabled: boolean
  rotationIntervalMs: number
}

/** v2.2 Progressive Jackpot display state. */
export interface ProgressiveJackpot {
  currentAmount: number
  lastWinAmount: number
  lastWinPlayerName: string | null
}
