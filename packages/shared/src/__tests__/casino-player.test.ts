import { describe, it, expect } from 'vitest'
import {
  CasinoPlayerStatus,
  isCasinoPlayer,
} from '../types/casino-player.js'

describe('CasinoPlayerStatus type', () => {
  it('should include all valid statuses', () => {
    const statuses: CasinoPlayerStatus[] = [
      'active',
      'sitting-out',
      'spectating',
      'busted',
    ]
    expect(statuses.length).toBe(4)
  })
})

describe('isCasinoPlayer type guard', () => {
  it('should accept valid CasinoPlayer objects', () => {
    const validPlayer = {
      id: 'player-123',
      name: 'Alice',
      avatarId: 'avatar-1',
      seatIndex: 0,
      isHost: true,
      isConnected: true,
      isReady: true,
      currentGameStatus: 'active' as const,
      sittingOutHandCount: 0,
      isBot: false,
    }
    expect(isCasinoPlayer(validPlayer)).toBe(true)
  })

  it('should accept players with optional bot config', () => {
    const botPlayer = {
      id: 'bot-1',
      name: 'Dealer Bot',
      avatarId: 'bot-avatar',
      seatIndex: 5,
      isHost: false,
      isConnected: true,
      isReady: true,
      currentGameStatus: 'active' as const,
      sittingOutHandCount: 0,
      isBot: true,
      botConfig: {
        difficulty: 'medium' as const,
        seed: 12345,
      },
    }
    expect(isCasinoPlayer(botPlayer)).toBe(true)
  })

  it('should accept players with cosmetic loadout', () => {
    const cosmPlayer = {
      id: 'player-456',
      name: 'Bob',
      avatarId: 'avatar-2',
      seatIndex: 2,
      isHost: false,
      isConnected: true,
      isReady: false,
      currentGameStatus: 'sitting-out' as const,
      sittingOutHandCount: 1,
      isBot: false,
      persistentId: 'persistent-456',
      cosmeticLoadout: {
        skinId: 'skin-premium',
        emoteIds: ['emote-1', 'emote-2'],
        tableAccessories: ['chip-stack', 'cup'],
      },
    }
    expect(isCasinoPlayer(cosmPlayer)).toBe(true)
  })

  it('should reject objects missing required id', () => {
    const missingId = {
      name: 'Charlie',
      avatarId: 'avatar-3',
      seatIndex: 1,
      isBot: false,
      isConnected: true,
    }
    expect(isCasinoPlayer(missingId)).toBe(false)
  })

  it('should reject objects missing required name', () => {
    const missingName = {
      id: 'player-789',
      avatarId: 'avatar-4',
      seatIndex: 3,
      isBot: false,
      isConnected: true,
    }
    expect(isCasinoPlayer(missingName)).toBe(false)
  })

  it('should reject objects missing required seatIndex', () => {
    const missingSeat = {
      id: 'player-999',
      name: 'David',
      avatarId: 'avatar-5',
      isBot: false,
      isConnected: true,
    }
    expect(isCasinoPlayer(missingSeat)).toBe(false)
  })

  it('should reject objects missing required isBot', () => {
    const missingIsBot = {
      id: 'player-111',
      name: 'Eve',
      avatarId: 'avatar-6',
      seatIndex: 4,
      isConnected: true,
    }
    expect(isCasinoPlayer(missingIsBot)).toBe(false)
  })

  it('should reject objects missing required isConnected', () => {
    const missingConnected = {
      id: 'player-222',
      name: 'Frank',
      avatarId: 'avatar-7',
      seatIndex: 5,
      isBot: false,
    }
    expect(isCasinoPlayer(missingConnected)).toBe(false)
  })

  it('should reject non-object types', () => {
    expect(isCasinoPlayer(null)).toBe(false)
    expect(isCasinoPlayer(undefined)).toBe(false)
    expect(isCasinoPlayer('not a player')).toBe(false)
    expect(isCasinoPlayer(42)).toBe(false)
    expect(isCasinoPlayer([])).toBe(false)
  })

  it('should reject objects with wrong property types', () => {
    const wrongTypes = {
      id: 123,
      name: 'Grace',
      avatarId: 'avatar-8',
      seatIndex: 'zero',
      isBot: false,
      isConnected: true,
    }
    expect(isCasinoPlayer(wrongTypes)).toBe(false)
  })
})
