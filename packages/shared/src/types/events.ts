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
  | 'unknown'

export interface ParsedVoiceCommand {
  intent: VoiceIntent
  entities: {
    amount?: number
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
  holeCards?: [string, string]
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
