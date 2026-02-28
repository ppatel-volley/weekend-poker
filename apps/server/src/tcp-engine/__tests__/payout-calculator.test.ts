import { describe, it, expect } from 'vitest'
import { calculatePairPlusPayout, calculateAnteBonus, calculateTcpPayout } from '../payout-calculator.js'
import { evaluateTcpHand } from '../hand-evaluator.js'
import type { Card } from '@weekend-casino/shared'

/** Helper to create a 3-card hand from shorthand notation. */
function hand(cards: string): [Card, Card, Card] {
  const result: Card[] = []
  const parts = cards.split(' ')
  for (const part of parts) {
    const rankStr = part.slice(0, -1)
    const suitChar = part.slice(-1)
    const rankMap: Record<string, Card['rank']> = {
      '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8',
      '9': '9', '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
    }
    const suitMap: Record<string, Card['suit']> = {
      's': 'spades', 'h': 'hearts', 'd': 'diamonds', 'c': 'clubs',
    }
    result.push({ rank: rankMap[rankStr]!, suit: suitMap[suitChar]! })
  }
  return result as [Card, Card, Card]
}

describe('calculatePairPlusPayout', () => {
  it('pays 40:1 for straight flush', () => {
    const result = evaluateTcpHand(hand('5h 6h 7h'))
    expect(calculatePairPlusPayout(result, 25)).toBe(1000)
  })

  it('pays 30:1 for three of a kind', () => {
    const result = evaluateTcpHand(hand('Ks Kh Kd'))
    expect(calculatePairPlusPayout(result, 25)).toBe(750)
  })

  it('pays 6:1 for straight', () => {
    const result = evaluateTcpHand(hand('9s 10h Jd'))
    expect(calculatePairPlusPayout(result, 25)).toBe(150)
  })

  it('pays 3:1 for flush', () => {
    const result = evaluateTcpHand(hand('2s 7s Qs'))
    expect(calculatePairPlusPayout(result, 25)).toBe(75)
  })

  it('pays 1:1 for pair', () => {
    const result = evaluateTcpHand(hand('8s 8h Ad'))
    expect(calculatePairPlusPayout(result, 25)).toBe(25)
  })

  it('pays 0 for high card (loses)', () => {
    const result = evaluateTcpHand(hand('As Jh 4d'))
    expect(calculatePairPlusPayout(result, 25)).toBe(0)
  })

  it('returns 0 if no bet placed', () => {
    const result = evaluateTcpHand(hand('5h 6h 7h'))
    expect(calculatePairPlusPayout(result, 0)).toBe(0)
  })
})

describe('calculateAnteBonus', () => {
  it('pays 5:1 for straight flush', () => {
    const result = evaluateTcpHand(hand('5h 6h 7h'))
    expect(calculateAnteBonus(result, 50)).toBe(250)
  })

  it('pays 4:1 for three of a kind', () => {
    const result = evaluateTcpHand(hand('Ks Kh Kd'))
    expect(calculateAnteBonus(result, 50)).toBe(200)
  })

  it('pays 1:1 for straight', () => {
    const result = evaluateTcpHand(hand('9s 10h Jd'))
    expect(calculateAnteBonus(result, 50)).toBe(50)
  })

  it('pays 0 for flush', () => {
    const result = evaluateTcpHand(hand('2s 7s Qs'))
    expect(calculateAnteBonus(result, 50)).toBe(0)
  })

  it('pays 0 for pair', () => {
    const result = evaluateTcpHand(hand('8s 8h Ad'))
    expect(calculateAnteBonus(result, 50)).toBe(0)
  })

  it('pays 0 for high card', () => {
    const result = evaluateTcpHand(hand('As Jh 4d'))
    expect(calculateAnteBonus(result, 50)).toBe(0)
  })
})

describe('calculateTcpPayout', () => {
  const anteBet = 50
  const playBet = 50
  const pairPlusBet = 25

  describe('player folds', () => {
    it('loses ante, no play bet, Pair Plus resolves independently', () => {
      const playerHand = evaluateTcpHand(hand('As 8h 3d')) // high card
      const dealerHand = evaluateTcpHand(hand('Ks Qh Jd')) // high card
      const result = calculateTcpPayout(playerHand, dealerHand, anteBet, 0, pairPlusBet, true)

      expect(result.antePayout).toBe(-anteBet)
      expect(result.playPayout).toBe(0)
      expect(result.anteBonus).toBe(0)
      expect(result.pairPlusPayout).toBe(0) // high card loses PP
      expect(result.totalReturn).toBe(0)
      expect(result.netResult).toBe(-(anteBet + pairPlusBet))
    })

    it('loses ante but wins Pair Plus if hand qualifies', () => {
      const playerHand = evaluateTcpHand(hand('8s 8h 3d')) // pair
      const dealerHand = evaluateTcpHand(hand('Ks Qh Jd'))
      const result = calculateTcpPayout(playerHand, dealerHand, anteBet, 0, pairPlusBet, true)

      expect(result.antePayout).toBe(-anteBet)
      expect(result.pairPlusPayout).toBe(25) // pair pays 1:1
      // Return: PP bet back + PP payout = 25 + 25 = 50
      expect(result.totalReturn).toBe(50)
      // Net: 50 - (50 + 25) = -25
      expect(result.netResult).toBe(-25)
    })
  })

  describe('dealer does not qualify', () => {
    it('ante pays 1:1, play pushes', () => {
      const playerHand = evaluateTcpHand(hand('Ks 8h 3d'))
      const dealerHand = evaluateTcpHand(hand('Js 5h 2d')) // J-high, DNQ
      const result = calculateTcpPayout(playerHand, dealerHand, anteBet, playBet, 0, false)

      expect(result.antePayout).toBe(50) // won 1:1
      expect(result.playPayout).toBe(0) // push
      expect(result.anteBonus).toBe(0)
      // Return: ante + ante win + play push = 50 + 50 + 50 = 150
      expect(result.totalReturn).toBe(150)
      // Net: 150 - 100 = 50
      expect(result.netResult).toBe(50)
    })

    it('ante pays 1:1 + ante bonus for straight, play pushes', () => {
      const playerHand = evaluateTcpHand(hand('9s 10h Jd')) // straight
      const dealerHand = evaluateTcpHand(hand('Js 5h 2d')) // DNQ
      const result = calculateTcpPayout(playerHand, dealerHand, anteBet, playBet, 0, false)

      expect(result.antePayout).toBe(50)
      expect(result.playPayout).toBe(0) // push
      expect(result.anteBonus).toBe(50) // straight 1:1 ante bonus
      // Return: 50+50 + 50 + 50 = 200
      expect(result.totalReturn).toBe(200)
      expect(result.netResult).toBe(100)
    })
  })

  describe('dealer qualifies, player wins', () => {
    it('both ante and play pay 1:1', () => {
      // Note: A-K-Q is a straight, not high card! Use A-K-J instead.
      const playerHand = evaluateTcpHand(hand('As Kh Jd')) // A-high (not a straight)
      const dealerHand = evaluateTcpHand(hand('Qs 5h 2d')) // Q-high, qualifies
      const result = calculateTcpPayout(playerHand, dealerHand, anteBet, playBet, 0, false)

      expect(result.antePayout).toBe(50)
      expect(result.playPayout).toBe(50)
      // Return: ante+win + play+win = 100+100 = 200
      expect(result.totalReturn).toBe(200)
      expect(result.netResult).toBe(100)
    })

    it('includes ante bonus for premium hands', () => {
      const playerHand = evaluateTcpHand(hand('5h 6h 7h')) // straight flush
      const dealerHand = evaluateTcpHand(hand('Qs 5d 2c')) // Q-high, qualifies
      const result = calculateTcpPayout(playerHand, dealerHand, anteBet, playBet, pairPlusBet, false)

      expect(result.antePayout).toBe(50) // 1:1
      expect(result.playPayout).toBe(50) // 1:1
      expect(result.anteBonus).toBe(250) // SF 5:1
      expect(result.pairPlusPayout).toBe(1000) // SF 40:1
      // Return: 100 + 100 + 250 + (25+1000) = 1475
      expect(result.totalReturn).toBe(1475)
    })
  })

  describe('dealer qualifies, player loses', () => {
    it('loses both ante and play', () => {
      const playerHand = evaluateTcpHand(hand('2s 5h 8d')) // 8-high
      const dealerHand = evaluateTcpHand(hand('Ks Qh Jd')) // K-high
      const result = calculateTcpPayout(playerHand, dealerHand, anteBet, playBet, 0, false)

      expect(result.antePayout).toBe(-50)
      expect(result.playPayout).toBe(-50)
      expect(result.totalReturn).toBe(0)
      expect(result.netResult).toBe(-100)
    })

    it('still receives Pair Plus if hand qualifies', () => {
      const playerHand = evaluateTcpHand(hand('8s 8h 3d')) // pair
      const dealerHand = evaluateTcpHand(hand('As Ah Kd')) // higher pair
      const result = calculateTcpPayout(playerHand, dealerHand, anteBet, playBet, pairPlusBet, false)

      expect(result.antePayout).toBe(-50)
      expect(result.playPayout).toBe(-50)
      expect(result.pairPlusPayout).toBe(25) // pair pays 1:1
      // Return: PP bet + PP payout = 25 + 25 = 50
      expect(result.totalReturn).toBe(50)
      // Net: 50 - 125 = -75
      expect(result.netResult).toBe(-75)
    })
  })

  describe('dealer qualifies, tie', () => {
    it('both ante and play push', () => {
      // Note: A-K-Q is a straight. Use non-sequential hand for pure high card tie.
      const playerHand = evaluateTcpHand(hand('As Kh Jd'))
      const dealerHand = evaluateTcpHand(hand('Ac Kd Js')) // identical high card hand
      const result = calculateTcpPayout(playerHand, dealerHand, anteBet, playBet, 0, false)

      expect(result.antePayout).toBe(0)
      expect(result.playPayout).toBe(0)
      // Return: ante + play (pushed) = 50 + 50 = 100
      expect(result.totalReturn).toBe(100)
      expect(result.netResult).toBe(0)
    })
  })
})
