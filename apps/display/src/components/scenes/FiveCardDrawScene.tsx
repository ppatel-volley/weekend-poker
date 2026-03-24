/**
 * 5-Card Draw scene — "The Lounge".
 *
 * Warm amber lighting, round table, player card fans.
 * Cards are shown face-down for opponents, face-up for the active
 * player during their turn. Discard animation dims selected cards.
 */
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useStateSyncSelector, usePhase } from '../../hooks/useVGFHooks.js'
import { CardDeckProvider, useCardDeck } from '../CardDeck.js'
import type { Card, FiveCardDrawGameState } from '@weekend-casino/shared'

/** Single 3D card from the GLB deck. */
function CardModel({
  card,
  faceUp,
  position,
  rotation,
  opacity = 1,
}: {
  card: Card
  faceUp: boolean
  position: [number, number, number]
  rotation?: [number, number, number]
  opacity?: number
}) {
  const { getCardClone, ready } = useCardDeck()
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!ready) return
    const parent = groupRef.current
    if (!parent) return

    // Clear previous children
    while (parent.children.length > 0) {
      parent.remove(parent.children[0]!)
    }

    const clone = getCardClone(card)
    if (!clone) return

    clone.visible = true
    // Make all child meshes visible and apply opacity
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = true
        if (opacity < 1) {
          child.material = child.material.clone()
          child.material.transparent = true
          child.material.opacity = opacity
        }
      }
    })

    parent.add(clone)
  }, [ready, card, faceUp, getCardClone, opacity])

  // Lay card flat on table: rotate -90° on X
  // Face-down: additionally rotate 180° on Y
  const baseRotation: [number, number, number] = [
    -Math.PI / 2 + (rotation?.[0] ?? 0),
    (faceUp ? 0 : Math.PI) + (rotation?.[1] ?? 0),
    rotation?.[2] ?? 0,
  ]

  return (
    <group ref={groupRef} position={position} rotation={baseRotation} scale={[0.007, 0.007, 0.007]} />
  )
}

/** Face-down card placeholder (when no card data available). */
function CardBack({
  position,
  rotation,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]}>
      <boxGeometry args={[0.28, 0.4, 0.01]} />
      <meshStandardMaterial color="#1a237e" />
    </mesh>
  )
}

/** Player hand display — 5 cards in a fan layout. */
function PlayerHand({
  position,
  rotation,
  faceUp,
  discardIndices,
  cards,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  faceUp: boolean
  discardIndices: number[]
  cards: Card[]
}) {
  return (
    <group position={position} rotation={rotation}>
      {[0, 1, 2, 3, 4].map((i) => {
        const isDiscarded = discardIndices.includes(i)
        const xOffset = (i - 2) * 0.35
        const yOffset = isDiscarded ? 0.15 : 0
        const card = cards[i]

        if (card && faceUp) {
          return (
            <CardModel
              key={i}
              card={card}
              faceUp
              position={[xOffset, yOffset, 0]}
              rotation={[0, 0, (i - 2) * 0.05]}
              opacity={isDiscarded ? 0.4 : 1}
            />
          )
        }

        if (card) {
          return (
            <CardModel
              key={i}
              card={card}
              faceUp={false}
              position={[xOffset, yOffset, 0]}
              rotation={[0, 0, (i - 2) * 0.05]}
              opacity={isDiscarded ? 0.4 : 1}
            />
          )
        }

        return (
          <CardBack
            key={i}
            position={[xOffset, yOffset, 0]}
            rotation={[0, 0, (i - 2) * 0.05]}
          />
        )
      })}
    </group>
  )
}

/** Seat positions around the table (4 players max). */
const SEAT_POSITIONS: Array<{
  pos: [number, number, number]
  rot: [number, number, number]
}> = [
  { pos: [0, 0.9, 2.2], rot: [-0.3, 0, 0] },
  { pos: [2.2, 0.9, 0], rot: [-0.3, -Math.PI / 2, 0] },
  { pos: [0, 0.9, -2.2], rot: [-0.3, Math.PI, 0] },
  { pos: [-2.2, 0.9, 0], rot: [-0.3, Math.PI / 2, 0] },
]

/** Inner scene content that uses CardDeckProvider context. */
function FiveCardDrawSceneContent() {
  const players = useStateSyncSelector((s) => s.players) ?? []
  const drawState = useStateSyncSelector((s) => s.fiveCardDraw) as FiveCardDrawGameState | undefined
  const phase = usePhase() as string
  const pot = drawState?.pot ?? 0

  const isDrawPhase = phase === 'DRAW_DRAW_PHASE'

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a0f0a" />
      </mesh>

      {/* Table */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[2.5, 2.5, 0.15, 32]} />
        <meshStandardMaterial color="#2a1a0a" />
      </mesh>

      {/* Felt top */}
      <mesh position={[0, 0.88, 0]}>
        <cylinderGeometry args={[2.35, 2.35, 0.02, 32]} />
        <meshStandardMaterial color="#0d5f2d" />
      </mesh>

      {/* Pot display (centre of table) */}
      {pot > 0 && (
        <group position={[0, 0.95, 0]}>
          <mesh>
            <cylinderGeometry args={[0.15, 0.15, 0.08, 16]} />
            <meshStandardMaterial color="#ffd700" />
          </mesh>
        </group>
      )}

      {/* Player hands */}
      {players.map((player: any, idx: number) => {
        const seat = SEAT_POSITIONS[idx % SEAT_POSITIONS.length]!
        const cards = drawState?.hands?.[player.id] ?? []
        const hasCards = cards.length === 5
        const discards = isDrawPhase
          ? (drawState?.discardSelections?.[player.id] ?? [])
          : []

        return hasCards ? (
          <PlayerHand
            key={player.id}
            position={seat.pos}
            rotation={seat.rot}
            faceUp={idx === 0}
            discardIndices={discards}
            cards={cards}
          />
        ) : null
      })}

      {/* Warm amber lighting (2400K feel) */}
      <ambientLight intensity={0.25} color="#ffe0b0" />
      <spotLight
        position={[0, 8, 0]}
        angle={0.5}
        penumbra={0.6}
        intensity={1.2}
        castShadow
        color="#ffcc80"
      />
      <pointLight position={[-3, 4, 2]} intensity={0.4} color="#ff9940" />
      <pointLight position={[3, 4, -2]} intensity={0.4} color="#ff9940" />
    </group>
  )
}

export function FiveCardDrawScene() {
  return (
    <CardDeckProvider>
      <FiveCardDrawSceneContent />
    </CardDeckProvider>
  )
}
