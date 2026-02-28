/**
 * Casino Phase Enum — All game phases across the multi-game platform.
 *
 * Naming Convention (D-003):
 * - Hold'em: unprefixed for backwards compatibility (LOBBY, POSTING_BLINDS, etc.)
 * - New games: UPPER_SNAKE_CASE with game-specific prefix (DRAW_, BJ_, BJC_, etc.)
 *
 * Single GameRuleset with phase namespaces (D-001): no separate rulesets per game.
 */
export enum CasinoPhase {
  // ────────────────────────────────────────────────────────────────
  // Shared Phases (v1)
  // ────────────────────────────────────────────────────────────────
  Lobby = 'LOBBY',
  GameSelect = 'GAME_SELECT',

  // ────────────────────────────────────────────────────────────────
  // Hold'em (unprefixed for backwards compatibility — D-003)
  // ────────────────────────────────────────────────────────────────
  PostingBlinds = 'POSTING_BLINDS',
  DealingHoleCards = 'DEALING_HOLE_CARDS',
  PreFlopBetting = 'PRE_FLOP_BETTING',
  DealingFlop = 'DEALING_FLOP',
  FlopBetting = 'FLOP_BETTING',
  DealingTurn = 'DEALING_TURN',
  TurnBetting = 'TURN_BETTING',
  DealingRiver = 'DEALING_RIVER',
  RiverBetting = 'RIVER_BETTING',
  AllInRunout = 'ALL_IN_RUNOUT',
  Showdown = 'SHOWDOWN',
  PotDistribution = 'POT_DISTRIBUTION',
  HandComplete = 'HAND_COMPLETE',

  // ────────────────────────────────────────────────────────────────
  // 5-Card Draw (DRAW_ prefix — D-003)
  // ────────────────────────────────────────────────────────────────
  DrawPostingBlinds = 'DRAW_POSTING_BLINDS',
  DrawDealing = 'DRAW_DEALING',
  DrawBetting1 = 'DRAW_BETTING_1',
  DrawDrawPhase = 'DRAW_DRAW_PHASE',
  DrawBetting2 = 'DRAW_BETTING_2',
  DrawShowdown = 'DRAW_SHOWDOWN',
  DrawPotDistribution = 'DRAW_POT_DISTRIBUTION',
  DrawHandComplete = 'DRAW_HAND_COMPLETE',

  // ────────────────────────────────────────────────────────────────
  // Blackjack Classic (BJ_ prefix — D-003)
  // ────────────────────────────────────────────────────────────────
  BjPlaceBets = 'BJ_PLACE_BETS',
  BjDealInitial = 'BJ_DEAL_INITIAL',
  BjInsurance = 'BJ_INSURANCE',
  BjPlayerTurns = 'BJ_PLAYER_TURNS',
  BjDealerTurn = 'BJ_DEALER_TURN',
  BjSettlement = 'BJ_SETTLEMENT',
  BjHandComplete = 'BJ_HAND_COMPLETE',

  // ────────────────────────────────────────────────────────────────
  // Blackjack Competitive (BJC_ prefix — D-003, D-007)
  // Sequential turns, no splits in v1 (D-007)
  // ────────────────────────────────────────────────────────────────
  BjcPlaceBets = 'BJC_PLACE_BETS',
  BjcDealInitial = 'BJC_DEAL_INITIAL',
  BjcPlayerTurns = 'BJC_PLAYER_TURNS',
  BjcShowdown = 'BJC_SHOWDOWN',
  BjcSettlement = 'BJC_SETTLEMENT',
  BjcHandComplete = 'BJC_HAND_COMPLETE',

  // ────────────────────────────────────────────────────────────────
  // Roulette (ROULETTE_ prefix — v2.0)
  // ────────────────────────────────────────────────────────────────
  RoulettePlaceBets = 'ROULETTE_PLACE_BETS',
  RouletteNoMoreBets = 'ROULETTE_NO_MORE_BETS',
  RouletteSpin = 'ROULETTE_SPIN',
  RouletteResult = 'ROULETTE_RESULT',
  RoulettePayout = 'ROULETTE_PAYOUT',
  RouletteRoundComplete = 'ROULETTE_ROUND_COMPLETE',

  // ────────────────────────────────────────────────────────────────
  // Three Card Poker (TCP_ prefix — v2.0, D-015)
  // ────────────────────────────────────────────────────────────────
  TcpPlaceBets = 'TCP_PLACE_BETS',
  TcpDealCards = 'TCP_DEAL_CARDS',
  TcpPlayerDecisions = 'TCP_PLAYER_DECISIONS',
  TcpDealerReveal = 'TCP_DEALER_REVEAL',
  TcpSettlement = 'TCP_SETTLEMENT',
  TcpRoundComplete = 'TCP_ROUND_COMPLETE',

  // ────────────────────────────────────────────────────────────────
  // Craps (CRAPS_ prefix — v2.1, D-016)
  // ────────────────────────────────────────────────────────────────
  CrapsNewShooter = 'CRAPS_NEW_SHOOTER',
  CrapsComeOutBetting = 'CRAPS_COME_OUT_BETTING',
  CrapsComeOutRoll = 'CRAPS_COME_OUT_ROLL',
  CrapsComeOutResolution = 'CRAPS_COME_OUT_RESOLUTION',
  CrapsPointBetting = 'CRAPS_POINT_BETTING',
  CrapsPointRoll = 'CRAPS_POINT_ROLL',
  CrapsPointResolution = 'CRAPS_POINT_RESOLUTION',
  CrapsRoundComplete = 'CRAPS_ROUND_COMPLETE',

  // ────────────────────────────────────────────────────────────────
  // Game Night (GN_ prefix — v2.1)
  // ────────────────────────────────────────────────────────────────
  GnSetup = 'GN_SETUP',
  GnLeaderboard = 'GN_LEADERBOARD',
  GnChampion = 'GN_CHAMPION',

  // ────────────────────────────────────────────────────────────────
  // Quick Play (v2.0)
  // ────────────────────────────────────────────────────────────────
  QpAutoRotate = 'QP_AUTO_ROTATE',
}

/**
 * Phases where betting/wagering actions are valid across all games.
 */
export const BETTING_PHASES = [
  // Hold'em
  CasinoPhase.PreFlopBetting,
  CasinoPhase.FlopBetting,
  CasinoPhase.TurnBetting,
  CasinoPhase.RiverBetting,
  // 5-Card Draw
  CasinoPhase.DrawBetting1,
  CasinoPhase.DrawBetting2,
  // Blackjack Classic
  CasinoPhase.BjPlayerTurns,
  CasinoPhase.BjDealerTurn,
  // Blackjack Competitive
  CasinoPhase.BjcPlayerTurns,
  // Roulette
  CasinoPhase.RoulettePlaceBets,
  // Three Card Poker
  CasinoPhase.TcpPlaceBets,
  // Craps
  CasinoPhase.CrapsComeOutBetting,
  CasinoPhase.CrapsPointBetting,
] as const

/**
 * Phases where dealing/card distribution animations occur.
 */
export const DEALING_PHASES = [
  // Hold'em
  CasinoPhase.DealingHoleCards,
  CasinoPhase.DealingFlop,
  CasinoPhase.DealingTurn,
  CasinoPhase.DealingRiver,
  // 5-Card Draw
  CasinoPhase.DrawDealing,
  CasinoPhase.DrawDrawPhase,
  // Blackjack Classic
  CasinoPhase.BjDealInitial,
  // Blackjack Competitive
  CasinoPhase.BjcDealInitial,
  // Three Card Poker
  CasinoPhase.TcpDealCards,
] as const

/**
 * Phases that resolve hand/round outcomes and update wallets.
 */
export const SETTLEMENT_PHASES = [
  // Hold'em
  CasinoPhase.Showdown,
  CasinoPhase.PotDistribution,
  // 5-Card Draw
  CasinoPhase.DrawShowdown,
  CasinoPhase.DrawPotDistribution,
  // Blackjack Classic
  CasinoPhase.BjSettlement,
  // Blackjack Competitive
  CasinoPhase.BjcSettlement,
  // Roulette
  CasinoPhase.RoulettePayout,
  // Three Card Poker
  CasinoPhase.TcpSettlement,
] as const

/**
 * Phases that end a hand/round and transition to next hand or game select.
 */
export const HAND_COMPLETE_PHASES = [
  CasinoPhase.HandComplete,
  CasinoPhase.DrawHandComplete,
  CasinoPhase.BjHandComplete,
  CasinoPhase.BjcHandComplete,
  CasinoPhase.RouletteRoundComplete,
  CasinoPhase.TcpRoundComplete,
  CasinoPhase.CrapsRoundComplete,
] as const

/**
 * Mapping of game to first phase. Used when transitioning from GAME_SELECT.
 */
export const GAME_FIRST_PHASE: Record<string, CasinoPhase> = {
  holdem: CasinoPhase.PostingBlinds,
  five_card_draw: CasinoPhase.DrawPostingBlinds,
  blackjack_classic: CasinoPhase.BjPlaceBets,
  blackjack_competitive: CasinoPhase.BjcPlaceBets,
  roulette: CasinoPhase.RoulettePlaceBets,
  three_card_poker: CasinoPhase.TcpPlaceBets,
  craps: CasinoPhase.CrapsNewShooter,
}
