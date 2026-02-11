/**
 * Poker game phases — PascalCase members with SCREAMING_SNAKE_CASE string values.
 * Both clients use the string values at runtime.
 */
export enum PokerPhase {
  Lobby = 'LOBBY',
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
}

/** Phases where betting actions are valid. */
export const BETTING_PHASES = [
  PokerPhase.PreFlopBetting,
  PokerPhase.FlopBetting,
  PokerPhase.TurnBetting,
  PokerPhase.RiverBetting,
] as const

/** Phases where dealing animations play. */
export const DEALING_PHASES = [
  PokerPhase.DealingHoleCards,
  PokerPhase.DealingFlop,
  PokerPhase.DealingTurn,
  PokerPhase.DealingRiver,
] as const
