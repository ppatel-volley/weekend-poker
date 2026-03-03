/**
 * Game Night achievement detection.
 *
 * MVP achievement set:
 * - ROYAL_FLUSH: Player won with a royal flush (Hold'em, Draw)
 * - STRAIGHT_FLUSH: Player won with a straight flush (Hold'em, Draw)
 * - FOUR_OF_A_KIND: Player won with four of a kind (Hold'em, Draw)
 * - NATURAL_BLACKJACK: Player got a natural 21 (BJ, BJC)
 * - TCP_STRAIGHT_FLUSH: Player had a straight flush in TCP
 * - TCP_MINI_ROYAL: Player had a mini royal (AKQ suited) in TCP
 * - STRAIGHT_UP_HIT: Player hit a straight-up number bet in roulette
 *
 * Achievement detection is called in hand-complete phase onBegin,
 * AFTER the round is settled but BEFORE the round counter increments.
 * This keeps it centralised rather than scattered across 6 thunk files.
 */

import type { CasinoGameState, GameNightAchievementType } from '@weekend-casino/shared'

interface DetectedAchievement {
  playerId: string
  type: GameNightAchievementType
}

/**
 * Detect achievements based on the current game state.
 * Returns an array of achievements to record.
 * Returns empty array when no achievements detected.
 */
export function detectAchievements(state: CasinoGameState): DetectedAchievement[] {
  const game = state.selectedGame
  if (!game) return []

  const achievements: DetectedAchievement[] = []

  switch (game) {
    case 'holdem':
      achievements.push(...detectPokerAchievements(state))
      break
    case 'five_card_draw':
      achievements.push(...detectPokerAchievements(state))
      break
    case 'blackjack_classic':
      achievements.push(...detectBlackjackAchievements(state))
      break
    case 'blackjack_competitive':
      achievements.push(...detectBjcAchievements(state))
      break
    case 'three_card_poker':
      achievements.push(...detectTcpAchievements(state))
      break
    case 'roulette':
      achievements.push(...detectRouletteAchievements(state))
      break
  }

  return achievements
}

/** Detect poker achievements (Hold'em and 5-Card Draw). */
function detectPokerAchievements(state: CasinoGameState): DetectedAchievement[] {
  const achievements: DetectedAchievement[] = []

  // Check handHistory for hand ranks — the last entry may contain winner info
  // For MVP, we check the communityCards + holeCards for Hold'em patterns
  // Since holeCards are wiped from broadcast state for security, we check
  // the sessionStats or handHistory for recorded hand ranks

  // Hold'em specific: check if any player's last hand was exceptional
  // The hand evaluator stores results, but we don't have direct access
  // in the broadcast state. For MVP, we'll detect based on communityCards
  // having the right pattern (conservative — only detects community-based hands)

  // Check community cards for four-of-a-kind potential
  const communityCards = state.communityCards ?? []
  if (communityCards.length >= 5) {
    const rankCounts: Record<string, number> = {}
    for (const card of communityCards) {
      rankCounts[card.rank] = (rankCounts[card.rank] ?? 0) + 1
    }
    // If community has 4 of a kind, award to all active players
    for (const [, count] of Object.entries(rankCounts)) {
      if (count >= 4) {
        for (const player of state.players) {
          if (player.status === 'active') {
            achievements.push({ playerId: player.id, type: 'FOUR_OF_A_KIND' })
          }
        }
      }
    }
  }

  // 5-Card Draw: check hands for special combinations
  if (state.fiveCardDraw?.hands) {
    for (const [playerId, cards] of Object.entries(state.fiveCardDraw.hands)) {
      if (!cards || cards.length < 5) continue
      const rankCounts: Record<string, number> = {}
      const suitCounts: Record<string, number> = {}
      for (const card of cards) {
        rankCounts[card.rank] = (rankCounts[card.rank] ?? 0) + 1
        suitCounts[card.suit] = (suitCounts[card.suit] ?? 0) + 1
      }

      // Four of a kind
      if (Object.values(rankCounts).some(c => c >= 4)) {
        achievements.push({ playerId, type: 'FOUR_OF_A_KIND' })
      }

      // Flush check (all same suit)
      const isFlush = Object.values(suitCounts).some(c => c >= 5)
      if (isFlush) {
        // Check for straight flush / royal flush
        const ranks = cards.map(c => c.rank).sort()
        const rankValues = ranks.map(r => rankToValue(r)).sort((a, b) => a - b)
        const isStraight = isConsecutive(rankValues)
        const isRoyal = rankValues[0] === 10 && rankValues[4] === 14 // 10-J-Q-K-A

        if (isStraight && isRoyal) {
          achievements.push({ playerId, type: 'ROYAL_FLUSH' })
        } else if (isStraight) {
          achievements.push({ playerId, type: 'STRAIGHT_FLUSH' })
        }
      }
    }
  }

  return achievements
}

/** Detect blackjack classic achievements. */
function detectBlackjackAchievements(state: CasinoGameState): DetectedAchievement[] {
  const achievements: DetectedAchievement[] = []
  const bj = state.blackjack
  if (!bj) return achievements

  for (const ps of bj.playerStates) {
    for (const hand of ps.hands) {
      if (hand.isBlackjack) {
        achievements.push({ playerId: ps.playerId, type: 'NATURAL_BLACKJACK' })
        break // One per player per round
      }
    }
  }

  return achievements
}

/** Detect blackjack competitive achievements. */
function detectBjcAchievements(state: CasinoGameState): DetectedAchievement[] {
  const achievements: DetectedAchievement[] = []
  const bjc = state.blackjackCompetitive
  if (!bjc) return achievements

  for (const ps of bjc.playerStates) {
    if (ps.hand.isBlackjack) {
      achievements.push({ playerId: ps.playerId, type: 'NATURAL_BLACKJACK' })
    }
  }

  return achievements
}

/** Detect Three Card Poker achievements. */
function detectTcpAchievements(state: CasinoGameState): DetectedAchievement[] {
  const achievements: DetectedAchievement[] = []
  const tcp = state.threeCardPoker
  if (!tcp) return achievements

  for (const ph of tcp.playerHands) {
    if (ph.handRank === 'straight_flush') {
      // Check for mini royal (AKQ suited)
      const ranks = ph.cards.map(c => c.rank).sort()
      const isMiniRoyal = ranks.includes('A') && ranks.includes('K') && ranks.includes('Q')
      if (isMiniRoyal) {
        achievements.push({ playerId: ph.playerId, type: 'TCP_MINI_ROYAL' })
      } else {
        achievements.push({ playerId: ph.playerId, type: 'TCP_STRAIGHT_FLUSH' })
      }
    }
  }

  return achievements
}

/** Detect roulette achievements. */
function detectRouletteAchievements(state: CasinoGameState): DetectedAchievement[] {
  const achievements: DetectedAchievement[] = []
  const roulette = state.roulette
  if (!roulette || roulette.winningNumber === null) return achievements

  for (const bet of roulette.bets) {
    if (bet.type === 'straight_up' && bet.status === 'won') {
      achievements.push({ playerId: bet.playerId, type: 'STRAIGHT_UP_HIT' })
    }
  }

  return achievements
}

/** Convert rank string to numeric value. */
function rankToValue(rank: string): number {
  const map: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return map[rank] ?? 0
}

/** Check if sorted numeric values form a consecutive sequence. */
function isConsecutive(values: number[]): boolean {
  if (values.length < 5) return false
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1]! + 1) return false
  }
  return true
}
