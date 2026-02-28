/**
 * Three Card Poker scene — "The Express".
 *
 * Compact table with dealer area, 3-card player positions,
 * and dealer qualification indicator.
 */

import { useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import type { ThreeCardPokerGameState, TcpPlayerHand } from '@weekend-casino/shared'

/** Card placeholder — face-down or face-up 3D card representation. */
function CardPlaceholder({
  position,
  faceUp = false,
  colour = '#2a2a4e',
}: {
  position: [number, number, number]
  faceUp?: boolean
  colour?: string
}) {
  return (
    <mesh position={position} rotation={faceUp ? [0, 0, 0] : [0, Math.PI, 0]}>
      <boxGeometry args={[0.35, 0.01, 0.5]} />
      <meshStandardMaterial color={faceUp ? '#ffffff' : colour} />
    </mesh>
  )
}

/** Chip stack visualisation. */
function ChipStack({
  position,
  amount,
  colour = '#f39c12',
}: {
  position: [number, number, number]
  amount: number
  colour?: string
}) {
  if (amount <= 0) return null
  const height = Math.min(amount / 100, 0.3)
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]}>
      <cylinderGeometry args={[0.15, 0.15, height, 16]} />
      <meshStandardMaterial color={colour} />
    </mesh>
  )
}

/** Single player position on the TCP table. */
function PlayerPosition({
  hand,
  seatPosition,
  showCards,
}: {
  hand: TcpPlayerHand
  seatPosition: [number, number, number]
  showCards: boolean
}) {
  const folded = hand.decision === 'fold'
  const cardColour = folded ? '#555555' : '#2a2a4e'

  return (
    <group position={seatPosition}>
      {/* Three cards */}
      <CardPlaceholder position={[-0.4, 0, 0]} faceUp={showCards} colour={cardColour} />
      <CardPlaceholder position={[0, 0, 0]} faceUp={showCards} colour={cardColour} />
      <CardPlaceholder position={[0.4, 0, 0]} faceUp={showCards} colour={cardColour} />

      {/* Ante chip */}
      <ChipStack position={[0, 0, 0.4]} amount={hand.anteBet} colour="#f39c12" />

      {/* Pair Plus chip */}
      <ChipStack position={[-0.4, 0, 0.4]} amount={hand.pairPlusBet} colour="#9b59b6" />

      {/* Play chip (appears after decision) */}
      {hand.decision === 'play' && (
        <ChipStack position={[0.4, 0, 0.4]} amount={hand.playBet} colour="#2ecc71" />
      )}

      {/* Decision indicator */}
      {hand.decision === 'play' && (
        <mesh position={[0, 0.1, -0.4]}>
          <planeGeometry args={[0.6, 0.2]} />
          <meshBasicMaterial color="#2ecc71" />
        </mesh>
      )}
      {folded && (
        <mesh position={[0, 0.1, -0.4]}>
          <planeGeometry args={[0.6, 0.2]} />
          <meshBasicMaterial color="#e74c3c" />
        </mesh>
      )}
    </group>
  )
}

/** Dealer area with face-down/face-up cards. */
function DealerArea({
  tcp,
}: {
  tcp: ThreeCardPokerGameState
}) {
  const revealed = tcp.dealerHand.revealed
  const hasCards = tcp.dealerHand.cards.length > 0

  return (
    <group position={[0, 0.86, -1.2]}>
      {/* Dealer cards */}
      {hasCards && (
        <>
          <CardPlaceholder position={[-0.4, 0, 0]} faceUp={revealed} colour="#1a1a3e" />
          <CardPlaceholder position={[0, 0, 0]} faceUp={revealed} colour="#1a1a3e" />
          <CardPlaceholder position={[0.4, 0, 0]} faceUp={revealed} colour="#1a1a3e" />
        </>
      )}

      {/* Qualification indicator */}
      {tcp.dealerQualifies !== null && (
        <mesh position={[0, 0.1, -0.5]}>
          <planeGeometry args={[1.5, 0.3]} />
          <meshBasicMaterial color={tcp.dealerQualifies ? '#27ae60' : '#c0392b'} />
        </mesh>
      )}
    </group>
  )
}

const SEAT_POSITIONS: [number, number, number][] = [
  [-1.2, 0.86, 0.8],
  [-0.4, 0.86, 1.0],
  [0.4, 0.86, 1.0],
  [1.2, 0.86, 0.8],
]

export function ThreeCardPokerScene() {
  const tcp = useStateSyncSelector(s => s.threeCardPoker) as ThreeCardPokerGameState | undefined
  const phase = useStateSyncSelector(s => s.phase) as string | undefined
  const showCards = phase === 'TCP_SETTLEMENT' || phase === 'TCP_ROUND_COMPLETE'

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Table surface */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[2.2, 2.2, 0.12, 32]} />
        <meshStandardMaterial color="#1a3a3a" />
      </mesh>

      {/* Table felt markings — betting areas */}
      <mesh position={[0, 0.87, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 0.4]} />
        <meshStandardMaterial color="#0d2d2d" />
      </mesh>

      {/* Dealer area */}
      {tcp && <DealerArea tcp={tcp} />}

      {/* Player positions */}
      {tcp?.playerHands.map((hand, i) => (
        <PlayerPosition
          key={hand.playerId}
          hand={hand}
          seatPosition={SEAT_POSITIONS[i] ?? SEAT_POSITIONS[0]!}
          showCards={showCards}
        />
      ))}

      {/* Balanced lighting (3000K feel) */}
      <ambientLight intensity={0.3} color="#f0e8e0" />
      <spotLight
        position={[0, 8, 2]}
        angle={0.5}
        penumbra={0.5}
        intensity={1.3}
        castShadow
        color="#e0e8f0"
      />
      <pointLight position={[-3, 5, 3]} intensity={0.3} color="#80c0c0" />
      <pointLight position={[3, 5, -3]} intensity={0.3} color="#c0c0c0" />
    </group>
  )
}
