import { PokerPhase } from './phases.js'

/**
 * Slot map entries for the recognition service.
 * Keys are slot categories, values are arrays of keywords to boost.
 */
export type SlotMap = Record<string, string[]>

/**
 * Returns the recognition service slot map for the given game phase.
 * Used to boost poker vocabulary accuracy during voice recognition.
 */
export function getSlotMapForPhase(phase: PokerPhase): SlotMap {
  switch (phase) {
    case PokerPhase.Lobby:
      return {
        command: ['ready', 'start', 'settings', 'easy', 'medium', 'hard'],
      }
    case PokerPhase.PreFlopBetting:
    case PokerPhase.FlopBetting:
    case PokerPhase.TurnBetting:
    case PokerPhase.RiverBetting:
      return {
        action: ['check', 'call', 'raise', 'fold', 'all in', 'bet'],
        amount: [
          'fifty', '50', 'hundred', '100', 'two hundred', '200',
          'three hundred', '300', 'five hundred', '500', 'thousand', '1000',
          'half pot', 'pot', 'min', 'minimum',
        ],
      }
    default:
      return {}
  }
}
