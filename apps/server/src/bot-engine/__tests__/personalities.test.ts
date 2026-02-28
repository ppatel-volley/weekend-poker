import { describe, it, expect } from 'vitest'
import {
  BOT_PERSONALITIES,
  getPersonality,
  pickDialogueLine,
  VINCENT,
  MAYA,
  REMY,
  JADE,
} from '../personalities.js'

describe('BOT_PERSONALITIES', () => {
  it('should have 4 personalities', () => {
    expect(Object.keys(BOT_PERSONALITIES)).toHaveLength(4)
  })

  it('should include vincent, maya, remy, jade', () => {
    expect(BOT_PERSONALITIES).toHaveProperty('vincent')
    expect(BOT_PERSONALITIES).toHaveProperty('maya')
    expect(BOT_PERSONALITIES).toHaveProperty('remy')
    expect(BOT_PERSONALITIES).toHaveProperty('jade')
  })

  it('each personality should have required fields', () => {
    for (const personality of Object.values(BOT_PERSONALITIES)) {
      expect(personality.id).toBeDefined()
      expect(personality.name).toBeDefined()
      expect(personality.description).toBeDefined()
      expect(personality.aggression).toBeGreaterThanOrEqual(0)
      expect(personality.aggression).toBeLessThanOrEqual(1)
      expect(personality.bluffFrequency).toBeGreaterThanOrEqual(0)
      expect(personality.bluffFrequency).toBeLessThanOrEqual(1)
      expect(personality.chattiness).toBeGreaterThanOrEqual(0)
      expect(personality.chattiness).toBeLessThanOrEqual(1)
      expect(personality.tightness).toBeGreaterThanOrEqual(0)
      expect(personality.tightness).toBeLessThanOrEqual(1)
    }
  })

  it('each personality should have all dialogue line categories', () => {
    const categories = [
      'onBigWin', 'onBigLoss', 'onBluff', 'onFold',
      'onRaise', 'onCall', 'onAllIn', 'idle',
    ] as const

    for (const personality of Object.values(BOT_PERSONALITIES)) {
      for (const cat of categories) {
        expect(personality.dialogueLines[cat]).toBeDefined()
        expect(Array.isArray(personality.dialogueLines[cat])).toBe(true)
        expect(personality.dialogueLines[cat].length).toBeGreaterThan(0)
      }
    }
  })
})

describe('personality trait ranges', () => {
  it('Vincent should be cautious (high tightness, low aggression)', () => {
    expect(VINCENT.tightness).toBeGreaterThan(0.7)
    expect(VINCENT.aggression).toBeLessThan(0.4)
  })

  it('Maya should be aggressive (low tightness, high aggression)', () => {
    expect(MAYA.aggression).toBeGreaterThan(0.7)
    expect(MAYA.tightness).toBeLessThan(0.4)
    expect(MAYA.chattiness).toBeGreaterThan(0.7)
  })

  it('Remy should be balanced and quiet', () => {
    expect(REMY.aggression).toBeGreaterThanOrEqual(0.4)
    expect(REMY.aggression).toBeLessThanOrEqual(0.6)
    expect(REMY.chattiness).toBeLessThan(0.3)
  })

  it('Jade should be unpredictable (mid-range everything)', () => {
    expect(JADE.aggression).toBeGreaterThanOrEqual(0.4)
    expect(JADE.aggression).toBeLessThanOrEqual(0.8)
    expect(JADE.chattiness).toBeGreaterThan(0.5)
  })
})

describe('getPersonality', () => {
  it('should return the correct personality by ID', () => {
    expect(getPersonality('vincent')).toBe(VINCENT)
    expect(getPersonality('maya')).toBe(MAYA)
    expect(getPersonality('remy')).toBe(REMY)
    expect(getPersonality('jade')).toBe(JADE)
  })

  it('should fall back to Vincent for unknown IDs', () => {
    expect(getPersonality('unknown')).toBe(VINCENT)
    expect(getPersonality('')).toBe(VINCENT)
  })
})

describe('pickDialogueLine', () => {
  it('should return a string from the correct category', () => {
    const line = pickDialogueLine(MAYA, 'onBigWin', () => 0)
    expect(MAYA.dialogueLines.onBigWin).toContain(line)
  })

  it('should use the provided random function for determinism', () => {
    // random=0 => index 0
    const line0 = pickDialogueLine(MAYA, 'onBigWin', () => 0)
    expect(line0).toBe(MAYA.dialogueLines.onBigWin[0])

    // random=0.99 => last index
    const lineLast = pickDialogueLine(MAYA, 'onBigWin', () => 0.99)
    const lastIdx = MAYA.dialogueLines.onBigWin.length - 1
    expect(lineLast).toBe(MAYA.dialogueLines.onBigWin[lastIdx])
  })

  it('should return empty string for empty categories', () => {
    const emptyPersonality = {
      ...VINCENT,
      dialogueLines: { ...VINCENT.dialogueLines, onBigWin: [] },
    }
    expect(pickDialogueLine(emptyPersonality, 'onBigWin')).toBe('')
  })
})
