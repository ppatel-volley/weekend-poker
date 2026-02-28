/**
 * Blackjack scene — "The Floor".
 *
 * Dealer position at top, up to 4 player positions in arc.
 * Dealer hand: first card face up, second face down until reveal.
 * Player hands: both cards face up.
 * Hand value display, bust/blackjack/push indicators.
 */

import { useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import type { BlackjackGameState, BlackjackHand, BlackjackPlayerState, Card } from '@weekend-casino/shared'

/** Card placeholder — face-down or face-up 3D card. */
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

/** Status indicator (bust/blackjack/push). */
function StatusIndicator({
  position,
  text,
  colour,
}: {
  position: [number, number, number]
  text: string
  colour: string
}) {
  return (
    <mesh position={position}>
      <planeGeometry args={[0.8, 0.25]} />
      <meshBasicMaterial color={colour} />
    </mesh>
  )
}

/** Single player position on the blackjack table. */
function PlayerPosition({
  playerState,
  seatPosition,
}: {
  playerState: BlackjackPlayerState
  seatPosition: [number, number, number]
}) {
  const hand = playerState.hands[playerState.activeHandIndex] ?? playerState.hands[0]
  if (!hand) return null

  const isBusted = hand.busted
  const isBj = hand.isBlackjack
  const surrendered = playerState.surrendered

  return (
    <group position={seatPosition}>
      {/* Player's cards */}
      {hand.cards.map((_card, i) => (
        <CardPlaceholder
          key={i}
          position={[(i - (hand.cards.length - 1) / 2) * 0.38, 0, 0]}
          faceUp
          colour={isBusted ? '#555555' : '#2a2a4e'}
        />
      ))}

      {/* Bet chip */}
      <ChipStack
        position={[0, 0, 0.5]}
        amount={hand.bet}
        colour={hand.doubled ? '#e74c3c' : '#f39c12'}
      />

      {/* Split hands indicator (show number of hands) */}
      {playerState.hands.length > 1 && (
        <mesh position={[0.6, 0.1, -0.3]}>
          <planeGeometry args={[0.4, 0.2]} />
          <meshBasicMaterial color="#3498db" />
        </mesh>
      )}

      {/* Status indicators */}
      {isBj && (
        <StatusIndicator position={[0, 0.12, -0.4]} text="BLACKJACK" colour="#f1c40f" />
      )}
      {isBusted && (
        <StatusIndicator position={[0, 0.12, -0.4]} text="BUST" colour="#e74c3c" />
      )}
      {surrendered && (
        <StatusIndicator position={[0, 0.12, -0.4]} text="SURRENDER" colour="#95a5a6" />
      )}

      {/* Insurance indicator */}
      {playerState.insuranceBet > 0 && (
        <ChipStack position={[-0.5, 0, 0.5]} amount={playerState.insuranceBet} colour="#9b59b6" />
      )}
    </group>
  )
}

/** Dealer area with face-up and hole card. */
function DealerArea({
  bj,
}: {
  bj: BlackjackGameState
}) {
  const dealer = bj.dealerHand
  const hasCards = dealer.cards.length > 0

  return (
    <group position={[0, 0.86, -1.4]}>
      {/* Dealer cards */}
      {hasCards && dealer.cards.map((_card, i) => (
        <CardPlaceholder
          key={i}
          position={[(i - (dealer.cards.length - 1) / 2) * 0.38, 0, 0]}
          faceUp={i === 0 || dealer.holeCardRevealed}
          colour="#1a1a3e"
        />
      ))}

      {/* Dealer value / bust indicator */}
      {dealer.holeCardRevealed && (
        <mesh position={[0, 0.1, -0.5]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshBasicMaterial color={dealer.busted ? '#c0392b' : '#27ae60'} />
        </mesh>
      )}

      {/* Blackjack indicator */}
      {dealer.isBlackjack && dealer.holeCardRevealed && (
        <mesh position={[0, 0.15, -0.8]}>
          <planeGeometry args={[1.2, 0.25]} />
          <meshBasicMaterial color="#f1c40f" />
        </mesh>
      )}
    </group>
  )
}

const SEAT_POSITIONS: [number, number, number][] = [
  [-1.5, 0.86, 0.8],
  [-0.5, 0.86, 1.1],
  [0.5, 0.86, 1.1],
  [1.5, 0.86, 0.8],
]

export function BlackjackScene() {
  const bj = useStateSyncSelector(s => s.blackjack) as BlackjackGameState | undefined

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>

      {/* Semi-circle table */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[3, 3, 0.12, 32, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#0a2a4a" />
      </mesh>

      {/* Table felt markings — betting circles */}
      {SEAT_POSITIONS.map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.87, pos[2] - 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshStandardMaterial color="#0d2d4d" />
        </mesh>
      ))}

      {/* Dealer area */}
      {bj && <DealerArea bj={bj} />}

      {/* Player positions */}
      {bj?.playerStates.map((ps, i) => (
        <PlayerPosition
          key={ps.playerId}
          playerState={ps}
          seatPosition={SEAT_POSITIONS[i] ?? SEAT_POSITIONS[0]!}
        />
      ))}

      {/* Bright, glamorous lighting (3500K feel) */}
      <ambientLight intensity={0.35} color="#fff5e6" />
      <spotLight
        position={[0, 8, 3]}
        angle={0.6}
        penumbra={0.4}
        intensity={1.5}
        castShadow
        color="#fffaf0"
      />
      <pointLight position={[-4, 5, 0]} intensity={0.3} color="#b0d0ff" />
      <pointLight position={[4, 5, 0]} intensity={0.3} color="#b0d0ff" />
    </group>
  )
}
