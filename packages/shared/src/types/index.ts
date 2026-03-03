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
  CASINO_GAME_DESCRIPTIONS,
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
  BjcPlayerState,
  BlackjackCompetitiveGameState,
  RouletteBetType,
  RouletteBet,
  RoulettePlayerState,
  RouletteHistoryEntry,
  RouletteConfig,
  RouletteGameState,
  ThreeCardPokerGameState,
  TcpHandRank,
  TcpPlayerHand,
  TcpDealerHand,
  TcpConfig,
  CrapsGameState,
  GameNightGameState,
  SpeedConfig,
  QuickPlayConfig,
  CasinoCrawlConfig,
  ProgressiveJackpot,
} from './casino-game-state.js'

export {
  DEFAULT_SPEED_CONFIG,
  SPEED_HOLDEM_CONFIG,
  SPEED_DRAW_CONFIG,
  SPEED_BLACKJACK_CONFIG,
  DEFAULT_QUICK_PLAY_CONFIG,
  DEFAULT_CASINO_CRAWL_CONFIG,
} from './casino-game-state.js'

// ────────────────────────────────────────────────────────────────────
// Reactions / Emotes (v2.0 — cosmetic only)
// ────────────────────────────────────────────────────────────────────

export type { ReactionType, ReactionEvent } from './reactions.js'
export {
  REACTION_TYPES,
  REACTION_RATE_LIMIT,
  MAX_REACTION_QUEUE_SIZE,
} from './reactions.js'

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

// ────────────────────────────────────────────────────────────────────
// Platform Types — TV Platform Integration
// ────────────────────────────────────────────────────────────────────

export type {
  PlatformType,
  InputMode,
  PlatformDetectionResult,
} from './platform.js'
export {
  TV_PLATFORMS,
  isTVPlatform,
} from './platform.js'

// ────────────────────────────────────────────────────────────────────
// Events / Voice / Dealer
// ────────────────────────────────────────────────────────────────────

export type {
  VoiceIntent,
  ParsedVoiceCommand,
  DealerCharacterId,
  ControllerMemberState,
  ServerToClientEvents,
  ControllerActions,
} from './events.js'
