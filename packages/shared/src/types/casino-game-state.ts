import type { CasinoPhase } from './casino-phases.js'
import type { CasinoGame } from './casino-game.js'
import type { CasinoPlayer } from './casino-player.js'
import type { Wallet } from './casino-wallet.js'
import type { SessionStats } from './casino-session-stats.js'
import type { VideoPlayback, BackgroundVideo } from './casino-video.js'
import type { BlindLevel, TTSMessage, SidePot } from './game-state.js'
import type { InputMode } from './platform.js'
import type { ReactionEvent } from './reactions.js'
import type { Card } from './cards.js'

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
  // Input Mode (TV platform integration)
  // ───────────────────────────────────────────────────────────────
  inputMode?: InputMode

  // ───────────────────────────────────────────────────────────────
  // Transient UI State
  // ───────────────────────────────────────────────────────────────
  betError?: {
    playerId: string
    message: string
    clearedAt: number
  }

  // ───────────────────────────────────────────────────────────────
  // Hold'em Backwards-Compatible Fields (D-003: unprefixed)
  // These live at root level for Hold'em (not in a sub-state)
  // ───────────────────────────────────────────────────────────────
  interHandDelaySec: number
  autoFillBots: boolean
  activePlayerIndex: number
  communityCards: Card[]
  pot: number
  sidePots: SidePot[]
  currentBet: number
  minRaiseIncrement: number
  // SECURITY: Always {} in broadcast state. Cards delivered via targeted private events.
  holeCards: Record<string, [Card, Card]>
  handHistory: unknown[]
  lastAggressor: string | null
  dealingComplete: boolean

  // ───────────────────────────────────────────────────────────────
  // Reactions / Emotes (v2.0 — cosmetic only)
  // ───────────────────────────────────────────────────────────────
  reactions: ReactionEvent[]

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
  // v2.0 Speed Variants (config-driven, NOT new game types)
  // ───────────────────────────────────────────────────────────────
  speedConfig?: SpeedConfig

  // ───────────────────────────────────────────────────────────────
  // v2.0 Quick-Play & Casino Crawl
  // ───────────────────────────────────────────────────────────────
  quickPlayMode?: QuickPlayConfig
  casinoCrawl?: CasinoCrawlConfig

  // ───────────────────────────────────────────────────────────────
  // v2.1+ Meta-Game Sub-States
  // ───────────────────────────────────────────────────────────────
  gameNight?: GameNightGameState
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

/** Roulette bet type — inside bets and outside bets. */
export type RouletteBetType =
  | 'straight_up'
  | 'split'
  | 'street'
  | 'corner'
  | 'six_line'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'high'
  | 'low'
  | 'dozen_1'
  | 'dozen_2'
  | 'dozen_3'
  | 'column_1'
  | 'column_2'
  | 'column_3'

/** Single roulette bet. */
export interface RouletteBet {
  id: string
  playerId: string
  type: RouletteBetType
  amount: number
  /** Which numbers are covered by this bet. */
  numbers: number[]
  /** Resolution status. */
  status: 'active' | 'won' | 'lost'
  /** Payout amount (0 until resolved). */
  payout: number
}

/** Per-player roulette state. */
export interface RoulettePlayerState {
  playerId: string
  totalBet: number
  totalPayout: number
  roundResult: number
  betsConfirmed: boolean
  favouriteNumbers: number[]
}

/** History entry for the roulette scoreboard. */
export interface RouletteHistoryEntry {
  roundNumber: number
  number: number
  colour: 'red' | 'black' | 'green'
}

/** Roulette table configuration. */
export interface RouletteConfig {
  minBet: number
  maxInsideBet: number
  maxOutsideBet: number
  maxTotalBet: number
  laPartage: boolean
}

/** v2.0 Roulette game state. */
export interface RouletteGameState {
  [key: string]: unknown

  /** Winning number for the current round (null until spin). */
  winningNumber: number | null
  /** Colour of the winning number. */
  winningColour: 'red' | 'black' | 'green' | null
  /** All bets placed this round. */
  bets: RouletteBet[]
  /** Per-player state. */
  players: RoulettePlayerState[]
  /** Recent winning numbers (last 20). */
  history: RouletteHistoryEntry[]
  /** Spin animation state. */
  spinState: 'idle' | 'spinning' | 'slowing' | 'stopped'
  /** Near-miss data for display animation. */
  nearMisses: { playerId: string; betNumber: number }[]

  /** Phase transition flags (C1 pattern). */
  allBetsPlaced: boolean
  bettingClosed: boolean
  spinComplete: boolean
  resultAnnounced: boolean
  payoutComplete: boolean
  roundCompleteReady: boolean

  /** Round number. */
  roundNumber: number
  /** Configuration. */
  config: RouletteConfig
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

/** Craps bet type — core bets + odds. */
export type CrapsBetType =
  | 'pass_line'
  | 'dont_pass'
  | 'come'
  | 'dont_come'
  | 'place'
  | 'field'
  | 'pass_odds'
  | 'dont_pass_odds'
  | 'come_odds'
  | 'dont_come_odds'

/** Single craps bet. */
export interface CrapsBet {
  id: string
  playerId: string
  type: CrapsBetType
  amount: number
  /** For Place bets: which number (4,5,6,8,9,10). */
  targetNumber?: number
  /** For Odds bets: which bet this is behind. */
  parentBetId?: string
  /** Whether this bet is currently "working" (active for resolution). */
  working: boolean
  status: 'active' | 'won' | 'lost' | 'push' | 'returned'
  /** Payout amount (set on resolution). */
  payout: number
}

/** Come/Don't Come bet with its own point. */
export interface CrapsComeBet {
  id: string
  playerId: string
  type: 'come' | 'dont_come'
  amount: number
  /** Come bet's established point (null until established). */
  comePoint: number | null
  /** Odds behind this come bet. */
  oddsAmount: number
  status: 'active' | 'won' | 'lost' | 'push' | 'returned'
}

/** Roll result for history tracking. */
export interface CrapsRollResult {
  die1: number
  die2: number
  total: number
  rollNumber: number
  /** Both dice same (e.g., 4+4 = hard 8). */
  isHardway: boolean
}

/** Per-player craps state. */
export interface CrapsPlayerState {
  playerId: string
  /** Total chips at risk on table. */
  totalAtRisk: number
  /** Whether player confirmed bets for current phase. */
  betsConfirmed: boolean
  /** Net result for current round. */
  roundResult: number
}

/** Craps table configuration. */
export interface CrapsConfig {
  minBet: number
  maxBet: number
  /** Max odds multiplier (1x, 2x, 3x default, 5x, 10x). */
  maxOddsMultiplier: number
  /** Place bets "off" during come-out (default: true). */
  placeBetsWorkOnComeOut: boolean
  /** Simple mode: Pass/Don't Pass only (default: true). */
  simpleMode: boolean
}

/** v2.1 Craps game state. Defined in TDD-backend.md Section 10. */
export interface CrapsGameState {
  [key: string]: unknown

  // ── Shooter Management ────────────────────────────────────────
  /** Current shooter's player ID. */
  shooterPlayerId: string
  /** Shooter seat index (for rotation). */
  shooterIndex: number

  // ── Point Tracking ────────────────────────────────────────────
  /** Established point (null during come-out). */
  point: number | null
  /** Whether puck is ON (point set) or OFF (come-out). */
  puckOn: boolean

  // ── Roll Results ──────────────────────────────────────────────
  /** First die (1-6). */
  lastRollDie1: number
  /** Second die (1-6). */
  lastRollDie2: number
  /** Sum (2-12). */
  lastRollTotal: number
  /** History of all rolls in this shooter's turn. */
  rollHistory: CrapsRollResult[]

  // ── Betting State ─────────────────────────────────────────────
  /** All active bets across all players. */
  bets: CrapsBet[]
  /** Come/Don't Come bets with own points. */
  comeBets: CrapsComeBet[]
  /** Per-player state. */
  players: CrapsPlayerState[]

  // ── Round Outcome Flags ───────────────────────────────────────
  /** Set true when 7 rolled and point active (shooter loses dice). */
  sevenOut: boolean
  /** Set true when point number rolled (shooter retains dice). */
  pointHit: boolean

  // ── Phase Transition Flags (C1 pattern) ───────────────────────
  newShooterReady: boolean
  allComeOutBetsPlaced: boolean
  rollComplete: boolean
  comeOutResolutionComplete: boolean
  allPointBetsPlaced: boolean
  pointResolutionComplete: boolean
  roundCompleteReady: boolean

  // ── Round Counter ─────────────────────────────────────────────
  roundNumber: number

  // ── Configuration ─────────────────────────────────────────────
  config: CrapsConfig
}

/** Game Night achievement type — MVP set for scoring bonuses. */
export type GameNightAchievementType =
  | 'ROYAL_FLUSH'
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'NATURAL_BLACKJACK'
  | 'TCP_STRAIGHT_FLUSH'
  | 'TCP_MINI_ROYAL'
  | 'STRAIGHT_UP_HIT'

/** A recorded achievement during a Game Night session. */
export interface GameNightAchievement {
  playerId: string
  type: GameNightAchievementType
  gameIndex: number
  timestamp: number
}

/** Visual theme for Game Night. */
export type GameNightTheme = 'classic' | 'neon' | 'high_roller' | 'tropical'

/** Per-player accumulated scores across all games. */
export interface GameNightPlayerTotal {
  playerId: string
  playerName: string
  totalScore: number
  gamesPlayed: number
  rankPoints: number
  marginBonus: number
  achievementBonus: number
  bestFinish: number
}

/** Per-player ranking within a single game result. */
export interface GameNightPlayerRanking {
  playerId: string
  playerName: string
  rank: number
  chipResult: number
  rankPoints: number
  marginBonus: number
  achievementBonus: number
  totalGameScore: number
}

/** Result of a single game within a Game Night session. */
export interface GameNightGameResult {
  game: CasinoGame
  gameIndex: number
  rankings: GameNightPlayerRanking[]
  roundsPlayed: number
  completedAt: number
}

/** v2.1 Game Night Mode state. Defined in TDD-backend.md Section 13. */
export interface GameNightGameState {
  [key: string]: unknown
  /** Whether Game Night Mode is currently active. */
  active: boolean
  /** Maximum rounds before transitioning to leaderboard. */
  roundLimit: number
  /** Number of rounds played so far in the current game. */
  roundsPlayed: number
  /** Player scores (playerId -> score) — kept for backwards compat. */
  scores: Record<string, number>
  /** Ordered list of games to play. */
  gameLineup: CasinoGame[]
  /** Index into gameLineup of the current game (0-based). */
  currentGameIndex: number
  /** Rounds to play per game before showing leaderboard. */
  roundsPerGame: number
  /** Detailed per-player score totals. */
  playerScores: Record<string, GameNightPlayerTotal>
  /** Results for each completed game. */
  gameResults: GameNightGameResult[]
  /** Visual theme. */
  theme: GameNightTheme
  /** Winner's playerId (set during GN_CHAMPION). */
  championId: string | null
  /** Session start timestamp. */
  startedAt: number
  /** Whether leaderboard display is ready to advance. */
  leaderboardReady: boolean
  /** Whether champion ceremony is ready to advance. */
  championReady: boolean
  /** Achievements recorded during the session. */
  achievements: GameNightAchievement[]
  /** Whether GN setup is confirmed and ready to start. */
  setupConfirmed: boolean
  /** Wallet snapshot taken at start of each game (playerId → balance). */
  walletSnapshot: Record<string, number>
}

/**
 * Speed variant configuration (v2.0). Config-driven, NOT new game types.
 * Applies to Hold'em, 5-Card Draw, and Blackjack.
 * Default: disabled (all games play at standard speed).
 */
export interface SpeedConfig {
  enabled: boolean
  /** Action timer in seconds (standard: 30, speed Hold'em: 10, speed Draw: 15, speed BJ: 10) */
  actionTimerSeconds: number
  /** Auto-fold on timeout — Hold'em/Draw only (standard: false, speed: true) */
  autoFoldOnTimeout: boolean
  /** Auto-stand on hard 17+ — Blackjack only (standard: false, speed: true) */
  autoStandOnHard17: boolean
  /** Hands between automatic blind increases — Hold'em only (0 = manual) */
  autoBlindsIncreaseEvery: number
  /** Fast animations flag for display client */
  fastAnimations: boolean
  /** Draw selection timer in seconds — 5-Card Draw only (standard: 30, speed: 10) */
  drawTimerSeconds: number
}

/** Default speed config (disabled — standard play). */
export const DEFAULT_SPEED_CONFIG: SpeedConfig = {
  enabled: false,
  actionTimerSeconds: 30,
  autoFoldOnTimeout: false,
  autoStandOnHard17: false,
  autoBlindsIncreaseEvery: 0,
  fastAnimations: false,
  drawTimerSeconds: 30,
}

/** Speed Hold'em preset. */
export const SPEED_HOLDEM_CONFIG: SpeedConfig = {
  enabled: true,
  actionTimerSeconds: 10,
  autoFoldOnTimeout: true,
  autoStandOnHard17: false,
  autoBlindsIncreaseEvery: 5,
  fastAnimations: true,
  drawTimerSeconds: 30,
}

/** Speed 5-Card Draw preset. */
export const SPEED_DRAW_CONFIG: SpeedConfig = {
  enabled: true,
  actionTimerSeconds: 15,
  autoFoldOnTimeout: true,
  autoStandOnHard17: false,
  autoBlindsIncreaseEvery: 0,
  fastAnimations: true,
  drawTimerSeconds: 10,
}

/** Speed Blackjack preset. */
export const SPEED_BLACKJACK_CONFIG: SpeedConfig = {
  enabled: true,
  actionTimerSeconds: 10,
  autoFoldOnTimeout: false,
  autoStandOnHard17: true,
  autoBlindsIncreaseEvery: 0,
  fastAnimations: true,
  drawTimerSeconds: 30,
}

/** v2.0 Quick-Play mode config (random game rotation). */
export interface QuickPlayConfig {
  enabled: boolean
  /** Hands/rounds to play before auto-rotating to next game */
  rotationIntervalHands: number
  /** Current hand/round count in the current game */
  currentHandCount: number
  /** History of games played this session (for weighting) */
  gamesPlayed: CasinoGame[]
}

/** Default quick-play config (disabled). */
export const DEFAULT_QUICK_PLAY_CONFIG: QuickPlayConfig = {
  enabled: false,
  rotationIntervalHands: 10,
  currentHandCount: 0,
  gamesPlayed: [],
}

/** v2.0 Casino Crawl config (sequential rotation through all games). */
export interface CasinoCrawlConfig {
  active: boolean
  /** Ordered list of games to cycle through */
  gamesOrder: CasinoGame[]
  /** Index into gamesOrder of the current game */
  currentIndex: number
  /** Rounds per game before rotating (default: 5) */
  roundsPerGame: number
  /** Rounds played in the current game */
  roundsPlayed: number
}

/** Default casino crawl config (inactive). */
export const DEFAULT_CASINO_CRAWL_CONFIG: CasinoCrawlConfig = {
  active: false,
  gamesOrder: [],
  currentIndex: 0,
  roundsPerGame: 5,
  roundsPlayed: 0,
}

/** v2.2 Progressive Jackpot display state. */
export interface ProgressiveJackpot {
  currentAmount: number
  lastWinAmount: number
  lastWinPlayerName: string | null
}
