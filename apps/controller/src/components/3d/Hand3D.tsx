/**
 * Drop-in replacement for flat HTML card displays.
 * Renders cards in a 3D fan inside an isolated R3F Canvas.
 */

import type { Card } from '@weekend-casino/shared'
import { CardCanvas } from './CardCanvas.js'
import { CardFan } from './CardFan.js'

export function Hand3D({
  cards,
  height = 140,
  scale,
}: {
  cards: Card[]
  height?: number
  scale?: number
}) {
  if (cards.length === 0) return null

  return (
    <CardCanvas height={height} bloom={false}>
      <CardFan cards={cards} scale={scale} />
    </CardCanvas>
  )
}
