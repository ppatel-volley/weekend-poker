/**
 * Single 3D card model component for the controller.
 * Uses getCardClone from CardDeckProvider.
 */

import { useMemo } from 'react'
import type { Card } from '@weekend-casino/shared'
import { useCardDeck } from './CardDeckProvider.js'

export function CardModel({
  card,
  position = [0, 0, 0],
  rotation = [-Math.PI / 2, 0, 0],
  scale = 1,
}: {
  card: Card
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) {
  const { getCardClone, ready } = useCardDeck()
  const clone = useMemo(
    () => {
      if (!ready) return null
      const c = getCardClone(card)
      if (c) {
        // Zero out GLB-space transforms so the R3F props control positioning
        c.position.set(0, 0, 0)
        c.rotation.set(0, 0, 0)
        c.scale.set(1, 1, 1)
      }
      return c
    },
    [ready, card.rank, card.suit, getCardClone],
  )

  if (!clone) return null

  return (
    <primitive
      object={clone}
      position={position}
      rotation={rotation}
      scale={[scale, scale, scale]}
    />
  )
}
