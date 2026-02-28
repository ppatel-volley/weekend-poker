import { describe, it, expect } from 'vitest'
import {
  STARTING_WALLET_BALANCE,
  isWallet,
  hasWalletBalance,
  getWalletBalance,
} from '../types/casino-wallet.js'

describe('Wallet constants', () => {
  it('should define STARTING_WALLET_BALANCE as 10,000', () => {
    expect(STARTING_WALLET_BALANCE).toBe(10_000)
  })

  it('should be a positive number', () => {
    expect(STARTING_WALLET_BALANCE).toBeGreaterThan(0)
  })
})

describe('isWallet type guard', () => {
  it('should accept valid empty wallet', () => {
    const emptyWallet = {}
    expect(isWallet(emptyWallet)).toBe(true)
  })

  it('should accept wallet with single player', () => {
    const singlePlayer = {
      'player-1': 10_000,
    }
    expect(isWallet(singlePlayer)).toBe(true)
  })

  it('should accept wallet with multiple players', () => {
    const multiPlayer = {
      'player-1': 10_000,
      'player-2': 8_500,
      'player-3': 12_000,
      'player-4': 9_200,
    }
    expect(isWallet(multiPlayer)).toBe(true)
  })

  it('should accept wallet with zero balance', () => {
    const withZero = {
      'player-1': 0,
      'player-2': 5_000,
    }
    expect(isWallet(withZero)).toBe(true)
  })

  it('should accept wallet with negative balance', () => {
    const withNegative = {
      'player-1': -1_000,
      'player-2': 15_000,
    }
    expect(isWallet(withNegative)).toBe(true)
  })

  it('should reject wallet with non-number values', () => {
    const withString = {
      'player-1': '10000',
      'player-2': 8_500,
    }
    expect(isWallet(withString)).toBe(false)
  })

  it('should reject wallet with null values', () => {
    const withNull = {
      'player-1': null,
      'player-2': 8_500,
    }
    expect(isWallet(withNull)).toBe(false)
  })

  it('should reject wallet with undefined values', () => {
    const withUndefined = {
      'player-1': undefined,
      'player-2': 8_500,
    }
    expect(isWallet(withUndefined)).toBe(false)
  })

  it('should reject non-object types', () => {
    expect(isWallet(null)).toBe(false)
    expect(isWallet(undefined)).toBe(false)
    expect(isWallet('not a wallet')).toBe(false)
    expect(isWallet(42)).toBe(false)
    expect(isWallet([])).toBe(false)
  })
})

describe('hasWalletBalance function', () => {
  it('should return true when player exists in wallet', () => {
    const wallet = {
      'player-1': 10_000,
      'player-2': 8_500,
    }
    expect(hasWalletBalance(wallet, 'player-1')).toBe(true)
    expect(hasWalletBalance(wallet, 'player-2')).toBe(true)
  })

  it('should return false when player missing from wallet', () => {
    const wallet = {
      'player-1': 10_000,
    }
    expect(hasWalletBalance(wallet, 'player-2')).toBe(false)
  })

  it('should return true even when balance is zero', () => {
    const wallet = {
      'player-1': 0,
    }
    expect(hasWalletBalance(wallet, 'player-1')).toBe(true)
  })

  it('should return true even when balance is negative', () => {
    const wallet = {
      'player-1': -5_000,
    }
    expect(hasWalletBalance(wallet, 'player-1')).toBe(true)
  })

  it('should return false for empty wallet', () => {
    const wallet = {}
    expect(hasWalletBalance(wallet, 'player-1')).toBe(false)
  })
})

describe('getWalletBalance function', () => {
  it('should return balance when player exists', () => {
    const wallet = {
      'player-1': 10_000,
      'player-2': 8_500,
    }
    expect(getWalletBalance(wallet, 'player-1')).toBe(10_000)
    expect(getWalletBalance(wallet, 'player-2')).toBe(8_500)
  })

  it('should return 0 when player missing', () => {
    const wallet = {
      'player-1': 10_000,
    }
    expect(getWalletBalance(wallet, 'player-2')).toBe(0)
  })

  it('should return 0 for empty wallet', () => {
    const wallet = {}
    expect(getWalletBalance(wallet, 'player-1')).toBe(0)
  })

  it('should return exact balance including zero', () => {
    const wallet = {
      'player-1': 0,
    }
    expect(getWalletBalance(wallet, 'player-1')).toBe(0)
  })

  it('should return negative balance', () => {
    const wallet = {
      'player-1': -5_000,
    }
    expect(getWalletBalance(wallet, 'player-1')).toBe(-5_000)
  })
})
