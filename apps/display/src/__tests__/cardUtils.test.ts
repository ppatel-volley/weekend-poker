import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import type { Card } from '@weekend-poker/shared'
import {
  RANK_NAMES,
  SUIT_NAMES,
  buildCardMeshMap,
  cardToMeshName,
  getCardMesh,
} from '../utils/cardUtils.js'

// ── Helpers ──────────────────────────────────────────────────

/** Create a minimal THREE.Group with a name, simulating GLB structure. */
function makeCardGroup(name: string): THREE.Group {
  const group = new THREE.Group()
  group.name = name
  return group
}

/** Build a fake deck scene containing named card groups. */
function makeDeckScene(names: string[]): THREE.Group {
  const scene = new THREE.Group()
  for (const name of names) {
    scene.add(makeCardGroup(name))
  }
  return scene
}

// ── Tests ────────────────────────────────────────────────────

describe('RANK_NAMES', () => {
  it('maps all 13 ranks to human-readable names', () => {
    expect(Object.keys(RANK_NAMES)).toHaveLength(13)
    expect(RANK_NAMES['2']).toBe('Two')
    expect(RANK_NAMES['10']).toBe('Ten')
    expect(RANK_NAMES['J']).toBe('Jack')
    expect(RANK_NAMES['Q']).toBe('Queen')
    expect(RANK_NAMES['K']).toBe('King')
    expect(RANK_NAMES['A']).toBe('Ace')
  })
})

describe('SUIT_NAMES', () => {
  it('maps all 4 suits to capitalised names', () => {
    expect(Object.keys(SUIT_NAMES)).toHaveLength(4)
    expect(SUIT_NAMES.hearts).toBe('Hearts')
    expect(SUIT_NAMES.diamonds).toBe('Diamonds')
    expect(SUIT_NAMES.clubs).toBe('Clubs')
    expect(SUIT_NAMES.spades).toBe('Spades')
  })
})

describe('cardToMeshName', () => {
  it('builds the correct mesh key for a card', () => {
    const card: Card = { rank: '8', suit: 'hearts' }
    expect(cardToMeshName(card)).toBe('Eight of Hearts')
  })

  it('handles face cards correctly', () => {
    expect(cardToMeshName({ rank: 'J', suit: 'spades' })).toBe('Jack of Spades')
    expect(cardToMeshName({ rank: 'Q', suit: 'diamonds' })).toBe('Queen of Diamonds')
    expect(cardToMeshName({ rank: 'K', suit: 'clubs' })).toBe('King of Clubs')
    expect(cardToMeshName({ rank: 'A', suit: 'hearts' })).toBe('Ace of Hearts')
  })
})

describe('buildCardMeshMap', () => {
  it('extracts groups whose name contains " of "', () => {
    const scene = makeDeckScene([
      'Ace of Spades',
      'Two of Hearts',
      'SomeOtherNode',
    ])
    const map = buildCardMeshMap(scene)

    expect(map.size).toBe(2)
    expect(map.has('Ace of Spades')).toBe(true)
    expect(map.has('Two of Hearts')).toBe(true)
    expect(map.has('SomeOtherNode')).toBe(false)
  })

  it('normalises the "Eigh of" typo to "Eight of"', () => {
    const scene = makeDeckScene(['Eigh of Hearts'])
    const map = buildCardMeshMap(scene)

    expect(map.has('Eight of Hearts')).toBe(true)
    expect(map.has('Eigh of Hearts')).toBe(false)
  })

  it('ignores non-Group children (plain meshes)', () => {
    const scene = new THREE.Group()
    const mesh = new THREE.Mesh()
    mesh.name = 'Ace of Spades'
    scene.add(mesh)

    const map = buildCardMeshMap(scene)
    expect(map.size).toBe(0)
  })
})

describe('getCardMesh', () => {
  it('returns the correct group for a valid card', () => {
    const scene = makeDeckScene(['Eight of Hearts', 'Ace of Spades'])
    const map = buildCardMeshMap(scene)

    const card: Card = { rank: '8', suit: 'hearts' }
    const result = getCardMesh(card, map)

    expect(result).toBeDefined()
    expect(result?.name).toBe('Eight of Hearts')
  })

  it('returns undefined for a card not in the map', () => {
    const scene = makeDeckScene(['Ace of Spades'])
    const map = buildCardMeshMap(scene)

    const result = getCardMesh({ rank: '2', suit: 'clubs' }, map)
    expect(result).toBeUndefined()
  })

  it('returns the correct group via normalised typo key', () => {
    // Simulate the actual GLB scenario: the group name has the typo
    const scene = makeDeckScene(['Eigh of Hearts'])
    const map = buildCardMeshMap(scene)

    // getCardMesh builds key "Eight of Hearts", map has normalised key
    const result = getCardMesh({ rank: '8', suit: 'hearts' }, map)
    expect(result).toBeDefined()
  })
})
