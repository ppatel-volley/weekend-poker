import type { Card } from './cards.js'
import type { PokerPhase } from './phases.js'

// ── Player types ──────────────────────────────────────────────

export type PlayerStatus = 'active' | 'folded' | 'all_in' | 'sitting_out' | 'busted'

export type PlayerAction =
  | 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in'
  | 'post_small_blind' | 'post_big_blind'

export type BotDifficulty = 'easy' | 'medium' | 'hard'

export interface BotConfig {
  difficulty: BotDifficulty
  personalityId: string
}

export interface PokerPlayer {
  id: string
  name: string
  seatIndex: number
  stack: number
  bet: number
  status: PlayerStatus
  lastAction: PlayerAction | null
  isBot: boolean
  botConfig?: BotConfig
  isConnected: boolean
  sittingOutHandCount: number
}

// ── Blind levels ──────────────────────────────────────────────

export interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  minBuyIn: number
  maxBuyIn: number
}

// ── Pot types ─────────────────────────────────────────────────

export interface SidePot {
  amount: number
  eligiblePlayerIds: string[]
}

// ── Hand tracking ─────────────────────────────────────────────

export interface HandAction {
  playerId: string
  playerName: string
  action: PlayerAction
  amount: number
  phase: PokerPhase
  timestamp: number
}

// ── TTS ───────────────────────────────────────────────────────

export type TTSPriority = 'high' | 'normal' | 'low'

export interface TTSMessage {
  id: string
  text: string
  voiceId: string
  priority: TTSPriority
  timestamp: number
}

// ── Session stats ─────────────────────────────────────────────

export interface HandHighlight {
  handNumber: number
  players: string[]
  description: string
  potSize: number
}

export interface PlayerSessionStats {
  handsPlayed: number
  handsWon: number
  totalWinnings: number
  totalLosses: number
  biggestPot: number
  vpip: number
  pfr: number
}

export interface SessionStats {
  handsPlayed: number
  totalPotDealt: number
  startedAt: number
  playerStats: Record<string, PlayerSessionStats>
  largestPot: HandHighlight | null
  biggestBluff: HandHighlight | null
  worstBeat: HandHighlight | null
}

// ── Main game state ───────────────────────────────────────────

/**
 * The complete poker game state, extending VGF's BaseGameState.
 *
 * BaseGameState provides: phase, previousPhase, __vgfStateVersion
 * We re-declare phase as PokerPhase for type narrowing.
 */
export interface PokerGameState {
  // Index signature required by VGF BaseGameState (extends Record<string, unknown>)
  [key: string]: unknown

  // VGF required
  phase: PokerPhase
  previousPhase?: PokerPhase

  // Table configuration
  blindLevel: BlindLevel
  dealerCharacterId: string
  interHandDelaySec: number
  autoFillBots: boolean

  // Hand state
  handNumber: number
  dealerIndex: number
  activePlayerIndex: number
  players: PokerPlayer[]
  communityCards: Card[]
  pot: number
  sidePots: SidePot[]
  currentBet: number
  minRaiseIncrement: number

  // Hand history (current hand only)
  handHistory: HandAction[]
  lastAggressor: string | null

  // Dealing state
  dealingComplete: boolean

  // Dealer display
  dealerMessage: string | null

  // TTS queue
  ttsQueue: TTSMessage[]

  // Session tracking
  sessionStats: SessionStats
}
