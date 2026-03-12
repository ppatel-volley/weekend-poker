/**
 * Fan-out layout for a hand of cards on the controller.
 * Cards spread in an arc, centred horizontally.
 */

import type { Card } from '@weekend-casino/shared'
import { CardModel } from './CardModel.js'

/** Maximum fan angle in radians (30 degrees total spread). */
const MAX_FAN_ANGLE = Math.PI / 6
/** Horizontal spacing between cards. */
const CARD_SPACING = 0.6

export function CardFan({
  cards,
  scale = 1.8,
  faceDown = false,
}: {
  cards: Card[]
  scale?: number
  faceDown?: boolean
}) {
  if (cards.length === 0) return null

  const count = cards.length
  const fanAngle = Math.min(MAX_FAN_ANGLE, count * 0.08)

  return (
    <group>
      {cards.map((card, i) => {
        // Spread cards in a fan from left to right
        const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1 // -1 to 1
        const x = t * CARD_SPACING * Math.min(count, 5) * 0.4
        const z = Math.abs(t) * 0.15 // Slight arc depth
        const rotZ = faceDown ? Math.PI : (-t * fanAngle) // Fan tilt or face-down flip

        return (
          <CardModel
            key={`${card.rank}-${card.suit}-${i}`}
            card={card}
            position={[x, 0, z]}
            rotation={[-Math.PI / 2, 0, rotZ]}
            scale={scale}
          />
        )
      })}
    </group>
  )
}
