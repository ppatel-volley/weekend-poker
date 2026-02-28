import { CasinoPhase } from '../types/casino-phases.js'

/**
 * Human-readable labels for every CasinoPhase.
 *
 * Used by controller and HUD to display friendly phase names
 * instead of raw UPPER_SNAKE_CASE strings.
 */
export const PHASE_LABELS: Record<CasinoPhase, string> = {
  // Shared
  [CasinoPhase.Lobby]: 'Lobby',
  [CasinoPhase.GameSelect]: 'Game Select',

  // Hold'em
  [CasinoPhase.PostingBlinds]: 'Posting Blinds',
  [CasinoPhase.DealingHoleCards]: 'Dealing Cards',
  [CasinoPhase.PreFlopBetting]: 'Pre-Flop',
  [CasinoPhase.DealingFlop]: 'Dealing Flop',
  [CasinoPhase.FlopBetting]: 'Flop',
  [CasinoPhase.DealingTurn]: 'Dealing Turn',
  [CasinoPhase.TurnBetting]: 'Turn',
  [CasinoPhase.DealingRiver]: 'Dealing River',
  [CasinoPhase.RiverBetting]: 'River',
  [CasinoPhase.AllInRunout]: 'All-In Runout',
  [CasinoPhase.Showdown]: 'Showdown',
  [CasinoPhase.PotDistribution]: 'Awarding Pot',
  [CasinoPhase.HandComplete]: 'Hand Complete',

  // 5-Card Draw
  [CasinoPhase.DrawPostingBlinds]: 'Posting Blinds',
  [CasinoPhase.DrawDealing]: 'Dealing Cards',
  [CasinoPhase.DrawBetting1]: 'First Bet',
  [CasinoPhase.DrawDrawPhase]: 'Draw Phase',
  [CasinoPhase.DrawBetting2]: 'Second Bet',
  [CasinoPhase.DrawShowdown]: 'Showdown',
  [CasinoPhase.DrawPotDistribution]: 'Awarding Pot',
  [CasinoPhase.DrawHandComplete]: 'Hand Complete',

  // Blackjack Classic
  [CasinoPhase.BjPlaceBets]: 'Place Your Bets',
  [CasinoPhase.BjDealInitial]: 'Dealing Cards',
  [CasinoPhase.BjInsurance]: 'Insurance',
  [CasinoPhase.BjPlayerTurns]: 'Your Turn',
  [CasinoPhase.BjDealerTurn]: 'Dealer\'s Turn',
  [CasinoPhase.BjSettlement]: 'Settlement',
  [CasinoPhase.BjHandComplete]: 'Hand Complete',

  // Blackjack Competitive
  [CasinoPhase.BjcPlaceBets]: 'Place Your Bets',
  [CasinoPhase.BjcDealInitial]: 'Dealing Cards',
  [CasinoPhase.BjcPlayerTurns]: 'Your Turn',
  [CasinoPhase.BjcShowdown]: 'Showdown',
  [CasinoPhase.BjcSettlement]: 'Settlement',
  [CasinoPhase.BjcHandComplete]: 'Hand Complete',

  // Roulette
  [CasinoPhase.RoulettePlaceBets]: 'Place Your Bets',
  [CasinoPhase.RouletteNoMoreBets]: 'No More Bets',
  [CasinoPhase.RouletteSpin]: 'Spinning',
  [CasinoPhase.RouletteResult]: 'Result',
  [CasinoPhase.RoulettePayout]: 'Payout',
  [CasinoPhase.RouletteRoundComplete]: 'Round Complete',

  // Three Card Poker
  [CasinoPhase.TcpPlaceBets]: 'Place Your Bets',
  [CasinoPhase.TcpDealCards]: 'Dealing Cards',
  [CasinoPhase.TcpPlayerDecisions]: 'Play or Fold',
  [CasinoPhase.TcpDealerReveal]: 'Dealer Reveals',
  [CasinoPhase.TcpSettlement]: 'Settlement',
  [CasinoPhase.TcpRoundComplete]: 'Round Complete',

  // Craps
  [CasinoPhase.CrapsNewShooter]: 'New Shooter',
  [CasinoPhase.CrapsComeOutBetting]: 'Come-Out Bets',
  [CasinoPhase.CrapsComeOutRoll]: 'Come-Out Roll',
  [CasinoPhase.CrapsComeOutResolution]: 'Come-Out Result',
  [CasinoPhase.CrapsPointBetting]: 'Point Bets',
  [CasinoPhase.CrapsPointRoll]: 'Point Roll',
  [CasinoPhase.CrapsPointResolution]: 'Point Result',
  [CasinoPhase.CrapsRoundComplete]: 'Round Complete',

  // Game Night
  [CasinoPhase.GnSetup]: 'Setup',
  [CasinoPhase.GnLeaderboard]: 'Leaderboard',
  [CasinoPhase.GnChampion]: 'Champion',

  // Quick Play
  [CasinoPhase.QpAutoRotate]: 'Auto Rotate',
}

/**
 * Get the human-readable label for a CasinoPhase.
 * Returns the raw phase string if no label is found (defensive fallback).
 */
export function getPhaseLabel(phase: CasinoPhase): string {
  return PHASE_LABELS[phase] ?? phase
}
