export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

export interface Card {
  rank: Rank
  suit: Suit
}

export const RANKS: readonly Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
export const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

/**
 * Convert a string rank to its numeric value (2–14).
 * Useful for hand evaluation and comparison.
 */
export function rankToNumeric(rank: Rank): number {
  const map: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return map[rank]
}
