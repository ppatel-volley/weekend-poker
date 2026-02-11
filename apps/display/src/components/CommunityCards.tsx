import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import type { Card } from '@weekend-poker/shared'
import { useStateSyncSelector } from '../hooks/useVGFHooks.js'
import { useCardDeck } from './CardDeck.js'
import { cardToMeshName } from '../utils/cardUtils.js'

// ── Layout constants ─────────────────────────────────────────

/** Positions for the five community cards (flop, turn, river). */
const COMMUNITY_CARD_POSITIONS: [number, number, number][] = [
  [-0.6, 0.01, -0.3],
  [-0.3, 0.01, -0.3],
  [0.0, 0.01, -0.3],
  [0.3, 0.01, -0.3],
  [0.6, 0.01, -0.3],
]

/** Scale factor applied to each card when placed on the table. */
const CARD_SCALE = 0.3

/** Rotation so the card faces upward (lying flat on the table). */
const CARD_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0)

// ── Component ────────────────────────────────────────────────

/**
 * Renders the community cards (flop / turn / river) at the
 * centre of the table.
 *
 * Each card is a clone from the CardDeck context so the same
 * source mesh can be re-used across multiple placements.
 */
export function CommunityCards() {
  const communityCards = useStateSyncSelector(
    (s) => s.communityCards,
  ) as Card[] | undefined

  const { getCardClone, setCardVisibility } = useCardDeck()

  // Track previous cards to identify newly revealed ones.
  const prevCardsRef = useRef<Card[]>([])

  // Track which clones we've placed so we can clean them up.
  const clonesRef = useRef<THREE.Group[]>([])
  const containerRef = useRef<THREE.Group>(null)

  const cards = communityCards ?? []

  // Determine which cards are newly revealed this render.
  const newlyRevealed = useMemo(() => {
    const prevCount = prevCardsRef.current.length
    return cards.slice(prevCount)
  }, [cards])

  useEffect(() => {
    prevCardsRef.current = cards
  }, [cards])

  // Place card clones into the scene.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Remove previous clones.
    for (const clone of clonesRef.current) {
      container.remove(clone)
    }
    clonesRef.current = []

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      if (!card) continue

      const position = COMMUNITY_CARD_POSITIONS[i]
      if (!position) continue

      const clone = getCardClone(card)
      if (!clone) continue

      clone.position.set(position[0], position[1], position[2])
      clone.rotation.copy(CARD_ROTATION)
      clone.scale.setScalar(CARD_SCALE)
      clone.visible = true

      // Mark newly revealed cards with userData for future animation.
      const isNew = newlyRevealed.some(
        (nc) => cardToMeshName(nc) === cardToMeshName(card),
      )
      clone.userData['newlyRevealed'] = isNew

      container.add(clone)
      clonesRef.current.push(clone)
    }

    return () => {
      // Cleanup on unmount.
      for (const clone of clonesRef.current) {
        container.remove(clone)
      }
      clonesRef.current = []
    }
  }, [cards, getCardClone, newlyRevealed, setCardVisibility])

  return <group ref={containerRef} />
}
