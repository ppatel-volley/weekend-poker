import type { PlayerAction } from './game-state.js'

/**
 * Voice command intent types produced by the intent parser.
 */
export type VoiceIntent =
  | 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in'
  | 'ready' | 'start' | 'settings'
  // 5-Card Draw intents
  | 'draw' | 'stand_pat' | 'discard'
  // TCP-specific intents
  | 'tcp_ante' | 'tcp_pair_plus' | 'tcp_play' | 'tcp_fold' | 'tcp_confirm'
  // Blackjack intents
  | 'bj_hit' | 'bj_stand' | 'bj_double' | 'bj_split' | 'bj_insurance' | 'bj_surrender'
  // Roulette intents
  | 'roulette_red' | 'roulette_black' | 'roulette_odd' | 'roulette_even'
  | 'roulette_high' | 'roulette_low' | 'roulette_straight' | 'roulette_split'
  | 'roulette_dozen' | 'roulette_repeat' | 'roulette_clear' | 'roulette_confirm'
  | 'roulette_no_bet'
  // Craps intents
  | 'craps_pass_line' | 'craps_dont_pass' | 'craps_come' | 'craps_dont_come'
  | 'craps_field' | 'craps_place' | 'craps_odds' | 'craps_roll'
  | 'unknown'

export interface ParsedVoiceCommand {
  intent: VoiceIntent
  entities: {
    amount?: number
    /** Second number for roulette split bets. */
    splitTarget?: number
  }
  confidence: number
  rawTranscript: string
}

/**
 * Dealer character identifiers.
 */
export type DealerCharacterId = 'vincent' | 'maya' | 'remy' | 'jade'

/**
 * Controller client member state — stored in SessionMember.state.
 */
export interface ControllerMemberState {
  displayName: string
  avatarId: string
}

/**
 * Server-to-client custom events (beyond VGF state sync).
 */
export interface ServerToClientEvents {
  dealerSpeech: (data: { text: string; dealerCharacterId: string }) => void
  botChat: (data: { botId: string; text: string; emotion: string }) => void
  sfx: (data: { name: string }) => void
}

/**
 * Actions that a controller can dispatch to the server.
 */
export interface ControllerActions {
  processVoiceCommand: (transcript: string) => void
  processPlayerAction: (playerId: string, action: PlayerAction, amount?: number) => void
}
