/**
 * Blackjack Competitive scene — "The Arena".
 *
 * All player hands visible, turn indicator, comparison at showdown.
 * No dealer hand (per PRD 19.2).
 * Sequential turns with clear visual indicator (per D-007).
 */

import { useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import type { BlackjackCompetitiveGameState, BjcPlayerState } from '@weekend-casino/shared'

/** Card placeholder — face-up 3D card. */
function CardPlaceholder({
  position,
  colour = '#2a2a4e',
}: {
  position: [number, number, number]
  colour?: string
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.35, 0.01, 0.5]} />
      <meshStandardMaterial color={colour} />
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

/** Status indicator (bust/blackjack/winner). */
function StatusIndicator({
  position,
  colour,
}: {
  position: [number, number, number]
  colour: string
}) {
  return (
    <mesh position={position}>
      <planeGeometry args={[0.8, 0.25]} />
      <meshBasicMaterial color={colour} />
    </mesh>
  )
}

/** Turn indicator ring — glowing ring around active player. */
function TurnIndicator({
  position,
}: {
  position: [number, number, number]
}) {
  return (
    <mesh position={[position[0], position[1] + 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.65, 32]} />
      <meshBasicMaterial color="#f1c40f" transparent opacity={0.8} />
    </mesh>
  )
}

/** Single player position in the arena. */
function ArenaPlayerPosition({
  playerState,
  seatPosition,
  isActive,
  isWinner,
}: {
  playerState: BjcPlayerState
  seatPosition: [number, number, number]
  isActive: boolean
  isWinner: boolean
}) {
  const hand = playerState.hand
  const isBusted = hand.busted
  const isBj = hand.isBlackjack

  return (
    <group position={seatPosition}>
      {/* Active turn indicator */}
      {isActive && <TurnIndicator position={[0, 0, 0]} />}

      {/* Player's cards */}
      {hand.cards.map((_card, i) => (
        <CardPlaceholder
          key={i}
          position={[(i - (hand.cards.length - 1) / 2) * 0.38, 0, 0]}
          colour={isBusted ? '#555555' : isWinner ? '#f1c40f' : '#2a2a4e'}
        />
      ))}

      {/* Bet chip */}
      <ChipStack
        position={[0, 0, 0.5]}
        amount={hand.bet}
        colour={hand.doubled ? '#e74c3c' : '#f39c12'}
      />

      {/* Status indicators */}
      {isBj && (
        <StatusIndicator position={[0, 0.12, -0.4]} colour="#f1c40f" />
      )}
      {isBusted && (
        <StatusIndicator position={[0, 0.12, -0.4]} colour="#e74c3c" />
      )}
      {isWinner && !isBj && (
        <StatusIndicator position={[0, 0.12, -0.4]} colour="#2ecc71" />
      )}
    </group>
  )
}

/** Central pot display. */
function PotDisplay({
  amount,
}: {
  amount: number
}) {
  if (amount <= 0) return null
  return (
    <group position={[0, 0.87, 0]}>
      <ChipStack position={[0, 0, 0]} amount={amount} colour="#e74c3c" />
    </group>
  )
}

const ARENA_SEAT_POSITIONS: [number, number, number][] = [
  [-1.5, 0.86, 1.0],
  [-0.5, 0.86, 1.3],
  [0.5, 0.86, 1.3],
  [1.5, 0.86, 1.0],
]

export function CompetitiveBlackjackScene() {
  const bjc = useStateSyncSelector(s => s.blackjackCompetitive) as BlackjackCompetitiveGameState | undefined

  const currentTurnPlayerId = bjc
    ? bjc.turnOrder[bjc.currentTurnIndex] ?? null
    : null

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>

      {/* Arena table — circular instead of semi-circular */}
      <mesh position={[0, 0.8, 0.5]} castShadow>
        <cylinderGeometry args={[2.8, 2.8, 0.12, 32]} />
        <meshStandardMaterial color="#1a0a2a" />
      </mesh>

      {/* Betting circles */}
      {ARENA_SEAT_POSITIONS.map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.87, pos[2] - 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshStandardMaterial color="#2d0d4d" />
        </mesh>
      ))}

      {/* Central pot */}
      {bjc && <PotDisplay amount={bjc.pot} />}

      {/* Player positions */}
      {bjc?.playerStates.map((ps, i) => (
        <ArenaPlayerPosition
          key={ps.playerId}
          playerState={ps}
          seatPosition={ARENA_SEAT_POSITIONS[i] ?? ARENA_SEAT_POSITIONS[0]!}
          isActive={ps.playerId === currentTurnPlayerId && !bjc.playerTurnsComplete}
          isWinner={bjc.winnerIds.includes(ps.playerId)}
        />
      ))}

      {/* Arena lighting — more dramatic, purple/gold tones */}
      <ambientLight intensity={0.25} color="#e6d5ff" />
      <spotLight
        position={[0, 8, 3]}
        angle={0.6}
        penumbra={0.4}
        intensity={1.8}
        castShadow
        color="#fffaf0"
      />
      <pointLight position={[-4, 5, 0]} intensity={0.4} color="#9b59b6" />
      <pointLight position={[4, 5, 0]} intensity={0.4} color="#f39c12" />
    </group>
  )
}
