import type { Rank, Suit, Card } from '@weekend-poker/shared'
import * as THREE from 'three'

/** Human-readable rank names matching the GLB mesh naming convention. */
export const RANK_NAMES: Record<Rank, string> = {
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
  'J': 'Jack',
  'Q': 'Queen',
  'K': 'King',
  'A': 'Ace',
}

/** Human-readable suit names matching the GLB mesh naming convention. */
export const SUIT_NAMES: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
}

/** Known typo in the GLB: "Eigh of" should be "Eight of". */
const MESH_NAME_TYPO = 'Eigh of'
const MESH_NAME_FIX = 'Eight of'

/**
 * Traverse the loaded deck scene and build a lookup map from
 * normalised card name (e.g. "Eight of Hearts") to the card's
 * THREE.Group node.
 *
 * Cards MUST be looked up by name, not index — Hearts, Diamonds,
 * and Clubs are stored in a non-standard order in the GLB.
 */
export function buildCardMeshMap(
  deckScene: THREE.Group,
): Map<string, THREE.Group> {
  const map = new Map<string, THREE.Group>()

  deckScene.traverse((child) => {
    if (!(child instanceof THREE.Group)) return
    if (!child.name.includes(' of ')) return

    const name = child.name.includes(MESH_NAME_TYPO)
      ? child.name.replace(MESH_NAME_TYPO, MESH_NAME_FIX)
      : child.name

    map.set(name, child)
  })

  return map
}

/**
 * Build the canonical mesh-name key for a given Card.
 * e.g. { rank: '8', suit: 'hearts' } -> "Eight of Hearts"
 */
export function cardToMeshName(card: Card): string {
  return `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`
}

/**
 * Look up the THREE.Group for a given Card from the pre-built mesh map.
 */
export function getCardMesh(
  card: Card,
  meshMap: Map<string, THREE.Group>,
): THREE.Group | undefined {
  return meshMap.get(cardToMeshName(card))
}
