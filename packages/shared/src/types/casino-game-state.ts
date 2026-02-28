import type { CasinoPhase } from './casino-phases.js'
import type { CasinoGame } from './casino-game.js'
import type { CasinoPlayer } from './casino-player.js'
import type { Wallet } from './casino-wallet.js'
import type { SessionStats } from './casino-session-stats.js'
import type { VideoPlayback, BackgroundVideo } from './casino-video.js'
import type { BlindLevel, TTSMessage, SidePot } from './game-state.js'

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
  /** Player hand cards (playerId -> Card[]) — 5 cards each. */
  hands: Record<string, Card[]>
  /** Per-player discard selections (playerId -> card indices 0-4 to discard). */
  discardSelections: Record<string, number[]>
  /** Replacement cards dealt after discard (playerId -> Card[]). */
  replacementCards: Record<string, Card[]>
  /** Players who have confirmed their discard selection. */
  confirmedDiscards: Record<string, boolean>
  /** Whether the draw (discard+replace) phase is complete. */
  drawComplete: boolean
  /** Current pot total. */
  pot: number
  /** Side pots for all-in scenarios. */
  sidePots: SidePot[]
  /** Current highest bet this round. */
  currentBet: number
  /** Minimum raise increment. */
  minRaiseIncrement: number
  /** Index of the currently active player. */
  activePlayerIndex: number
}

/**
 * A single blackjack hand (players can have multiple via splits).
 */
export interface BlackjackHand {
  cards: Card[]
  /** Whether this hand has stood. */
  stood: boolean
  /** Whether this hand has busted (value > 21). */
  busted: boolean
  /** Whether this hand is a natural blackjack (first two cards = 21). */
  isBlackjack: boolean
  /** Whether the player doubled down on this hand. */
  doubled: boolean
  /** Bet amount for this hand. */
  bet: number
  /** Computed hand value (best non-bust value, or bust value). */
  value: number
  /** Whether the hand value is soft (contains an Ace counted as 11). */
  isSoft: boolean
}

/**
 * Blackjack dealer hand.
 */
export interface BlackjackDealerHand {
  cards: Card[]
  /** Whether the hole card has been revealed. */
  holeCardRevealed: boolean
  /** Computed hand value (after reveal). */
  value: number
  /** Whether the value is soft. */
  isSoft: boolean
  /** Whether the dealer has busted. */
  busted: boolean
  /** Whether the dealer has a natural blackjack. */
  isBlackjack: boolean
}

/** Per-player blackjack state. */
export interface BlackjackPlayerState {
  playerId: string
  /** Array of hands (normally 1; more if split). */
  hands: BlackjackHand[]
  /** Index of the currently active hand (for splits). */
  activeHandIndex: number
  /** Insurance bet amount (0 if not placed). */
  insuranceBet: number
  /** Whether insurance has been offered and resolved for this player. */
  insuranceResolved: boolean
  /** Whether this player has surrendered. */
  surrendered: boolean
  /** Total payout for this round (set during settlement). */
  totalPayout: number
  /** Net result for this round. */
  roundResult: number
}

/** Blackjack difficulty (affects dealer soft-17 rule per D-009). */
export type BlackjackDifficulty = 'easy' | 'normal' | 'hard'

/** v1 Blackjack Classic game state. Defined in TDD-backend.md Section 6. */
export interface BlackjackGameState {
  [key: string]: unknown
  /** Per-player state (hands, bets, insurance). */
  playerStates: BlackjackPlayerState[]
  /** Dealer's hand. */
  dealerHand: BlackjackDealerHand
  /** Order of player turns. */
  turnOrder: string[]
  /** Index into turnOrder of the player currently acting. */
  currentTurnIndex: number
  /** Whether all bets have been placed (phase transition flag). */
  allBetsPlaced: boolean
  /** Whether the initial deal is complete (phase transition flag). */
  dealComplete: boolean
  /** Whether insurance has been offered (phase transition flag). */
  insuranceComplete: boolean
  /** Whether all player turns are complete (phase transition flag). */
  playerTurnsComplete: boolean
  /** Whether the dealer turn is complete (phase transition flag). */
  dealerTurnComplete: boolean
  /** Whether settlement is complete (phase transition flag). */
  settlementComplete: boolean
  /** Whether the round is ready for next hand or game switch. */
  roundCompleteReady: boolean
  /** Round number (for stats). */
  roundNumber: number
  /** Shoe penetration percentage (0-100). */
  shoePenetration: number
  /** Configuration. */
  config: BlackjackConfig
}

/** Blackjack table configuration. */
export interface BlackjackConfig {
  minBet: number
  maxBet: number
  /** Dealer hits on soft 17 (D-009: false by default, configurable). */
  dealerHitsSoft17: boolean
  /** Number of decks in the shoe. */
  numberOfDecks: number
  /** Shoe reshuffle penetration threshold (0-1). */
  reshuffleThreshold: number
  /** Blackjack payout ratio (default 1.5 = 3:2). */
  blackjackPaysRatio: number
  /** Whether insurance is offered. */
  insuranceEnabled: boolean
  /** Whether surrender is allowed. */
  surrenderEnabled: boolean
  /** Whether splits are allowed. */
  splitEnabled: boolean
  /** Max number of splits allowed. */
  maxSplits: number
}

/** Per-player state in competitive blackjack (no splits, no insurance, no surrender). */
export interface BjcPlayerState {
  playerId: string
  /** Single hand (no splits per D-007). */
  hand: BlackjackHand
  /** Whether this player has finished their turn (stood or busted). */
  turnComplete: boolean
}

/** v1 Blackjack Competitive game state. Defined in TDD-backend.md Section 7. */
export interface BlackjackCompetitiveGameState {
  [key: string]: unknown
  /** Per-player state (single hand each, no splits per D-007). */
  playerStates: BjcPlayerState[]
  /** Total pot (sum of all antes + raises). */
  pot: number
  /** Order of player turns (sequential per D-007). */
  turnOrder: string[]
  /** Index into turnOrder of the currently acting player. */
  currentTurnIndex: number
  /** Whether all antes have been placed (phase transition flag). */
  allAntesPlaced: boolean
  /** Whether the initial deal is complete (phase transition flag). */
  dealComplete: boolean
  /** Whether all player turns are complete (phase transition flag). */
  playerTurnsComplete: boolean
  /** Whether showdown reveal is complete (phase transition flag). */
  showdownComplete: boolean
  /** Whether settlement is complete (phase transition flag). */
  settlementComplete: boolean
  /** Whether the round is ready for next hand or game switch. */
  roundCompleteReady: boolean
  /** Round number (for stats). */
  roundNumber: number
  /** Shoe penetration percentage (0-100). */
  shoePenetration: number
  /** Ante amount for this round (derived from blind level). */
  anteAmount: number
  /** Winner IDs from showdown (empty until settlement). */
  winnerIds: string[]
  /** Result message for display. */
  resultMessage: string
}

/** v2.0 Roulette game state. Defined in TDD-backend.md Section 8. */
export interface RouletteGameState {
  [key: string]: unknown
  // TBD: Will include bets, wheel result, payout, etc.
}

/**
 * Three Card Poker hand rank — 3-card poker uses DIFFERENT rankings from 5-card.
 * CRITICAL: Straights rank ABOVE flushes (48 straight combos vs 1,096 flush combos).
 */
export type TcpHandRank =
  | 'straight_flush'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'pair'
  | 'high_card'

/** Per-player hand state in TCP. */
export interface TcpPlayerHand {
  playerId: string
  /** Player's 3 cards (sent to controller, hidden on TV until showdown) */
  cards: Card[]
  /** Ante bet amount */
  anteBet: number
  /** Play bet amount (= anteBet if playing, 0 if folded) */
  playBet: number
  /** Pair Plus side bet amount (0 if not placed) */
  pairPlusBet: number
  /** Decision: play, fold, or undecided */
  decision: 'undecided' | 'play' | 'fold'
  /** Evaluated hand rank */
  handRank: TcpHandRank | null
  /** Numeric strength for comparison (higher = better) */
  handStrength: number
  /** Ante bonus earned (0 if none) */
  anteBonus: number
  /** Pair Plus payout (0 if lost or not placed) */
  pairPlusPayout: number
  /** Total payout for the round */
  totalPayout: number
  /** Net result (total payout minus total wagered) */
  roundResult: number
}

/** Dealer's hand state in TCP. */
export interface TcpDealerHand {
  /** Dealer's cards (empty/hidden until reveal phase) */
  cards: Card[]
  /** Whether cards have been revealed on display */
  revealed: boolean
  /** Evaluated hand rank */
  handRank: TcpHandRank | null
  /** Numeric strength for comparison */
  handStrength: number
}

/** TCP table configuration. */
export interface TcpConfig {
  minAnte: number
  maxAnte: number
  maxPairPlus: number
}

/** v2.0 Three Card Poker game state. Defined in TDD-backend.md Section 9. */
export interface ThreeCardPokerGameState {
  [key: string]: unknown

  /** Per-player hand state */
  playerHands: TcpPlayerHand[]

  /** Dealer's hand (hidden until reveal) */
  dealerHand: TcpDealerHand

  /** Whether the dealer qualifies (Queen-high or better) */
  dealerQualifies: boolean | null

  /** Phase transition flags (C1 pattern) */
  allAntesPlaced: boolean
  dealComplete: boolean
  allDecisionsMade: boolean
  dealerRevealed: boolean
  payoutComplete: boolean
  roundCompleteReady: boolean

  /** Round number (for stats) */
  roundNumber: number

  /** Configuration */
  config: TcpConfig
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
