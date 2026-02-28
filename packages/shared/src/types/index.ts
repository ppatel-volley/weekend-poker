/**
 * Shared Types — Central export for all casino and poker game types.
 *
 * Organization:
 *   - Casino (multi-game): CasinoPhase, CasinoGame, CasinoGameState, CasinoPlayer, etc.
 *   - Poker (backwards compat): PokerPhase, PokerGameState, PokerPlayer, etc.
 *   - Shared: Cards, TTS, Voice, Events, etc.
 */

// ────────────────────────────────────────────────────────────────────
// Casino Types — Multi-Game Platform (v1 and v2)
// ────────────────────────────────────────────────────────────────────

export {
  CasinoPhase,
  BETTING_PHASES,
  DEALING_PHASES,
  SETTLEMENT_PHASES,
  HAND_COMPLETE_PHASES,
  GAME_FIRST_PHASE,
} from './casino-phases.js'

export type { CasinoGame } from './casino-game.js'
export {
  CASINO_GAME_LABELS,
  V1_GAMES,
  V2_0_GAMES,
  V2_1_GAMES,
  ALL_GAMES,
  isCasinoGame,
} from './casino-game.js'

export type {
  CasinoPlayer,
  CasinoPlayerStatus,
  CosmeticLoadout,
} from './casino-player.js'
export { isCasinoPlayer } from './casino-player.js'

export type { Wallet, WalletTransaction, RebuyRequest } from './casino-wallet.js'
export {
  STARTING_WALLET_BALANCE,
  isWallet,
  hasWalletBalance,
  getWalletBalance,
} from './casino-wallet.js'

export type {
  SessionStats,
  PlayerSessionStats,
  GameResultStats,
} from './casino-session-stats.js'
export {
  createSessionStats,
  createPlayerSessionStats,
} from './casino-session-stats.js'

export type {
  VideoPlayback,
  BackgroundVideo,
} from './casino-video.js'
export {
  VIDEO_ASSET_COUNTS,
  isVideoPlayback,
  createVideoPlayback,
} from './casino-video.js'

export type {
  CasinoGameState,
  HoldemGameState,
  FiveCardDrawGameState,
  BlackjackHand,
  BlackjackDealerHand,
  BlackjackPlayerState,
  BlackjackDifficulty,
  BlackjackGameState,
  BlackjackConfig,
  BlackjackCompetitiveGameState,
  RouletteGameState,
  ThreeCardPokerGameState,
  TcpHandRank,
  TcpPlayerHand,
  TcpDealerHand,
  TcpConfig,
  CrapsGameState,
  GameNightGameState,
  QuickPlayConfig,
  ProgressiveJackpot,
} from './casino-game-state.js'

// ────────────────────────────────────────────────────────────────────
// Poker Types — Backwards Compatibility (v1 Hold'em)
// ────────────────────────────────────────────────────────────────────

export {
  PokerPhase,
  BETTING_PHASES as POKER_BETTING_PHASES,
  DEALING_PHASES as POKER_DEALING_PHASES,
} from './phases.js'

export type {
  PokerGameState,
  PokerPlayer,
  PlayerStatus,
  PlayerAction,
  BotDifficulty,
  BotConfig,
  BlindLevel,
  SidePot,
  HandAction,
  TTSPriority,
  TTSMessage,
  HandHighlight,
  PlayerSessionStats as PokerPlayerSessionStats,
  SessionStats as PokerSessionStats,
} from './game-state.js'

// ────────────────────────────────────────────────────────────────────
// Shared Types
// ────────────────────────────────────────────────────────────────────

export type {
  Card,
  Suit,
  Rank,
} from './cards.js'
export {
  SUITS,
  RANKS,
  rankToNumeric,
} from './cards.js'
