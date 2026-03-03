/**
 * Roulette scene — "The Wheel".
 *
 * 3D European roulette wheel with betting board,
 * history display, and spin animation.
 */

import { useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import type { RouletteGameState } from '@weekend-casino/shared'

/** Single pocket on the wheel. */
export function WheelPocket({
  colour,
  angle,
  isWinner,
}: {
  number: number
  colour: string
  angle: number
  isWinner: boolean
}) {
  const radius = 1.8
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  return (
    <mesh position={[x, 0.92, z]} rotation={[-Math.PI / 2, 0, -angle]}>
      <planeGeometry args={[0.25, 0.12]} />
      <meshStandardMaterial
        color={colour}
        emissive={isWinner ? '#ffff00' : '#000000'}
        emissiveIntensity={isWinner ? 0.5 : 0}
      />
    </mesh>
  )
}

/** Roulette wheel 3D representation. */
function RouletteWheel({
  winningNumber,
  spinState,
}: {
  winningNumber: number | null
  spinState: string
}) {
  const isSpinning = spinState === 'spinning' || spinState === 'slowing'

  return (
    <group position={[0, 0, -0.8]}>
      {/* Wheel base */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[2.0, 2.0, 0.08, 64]} />
        <meshStandardMaterial color="#2c1810" />
      </mesh>

      {/* Wheel rim */}
      <mesh position={[0, 0.9, 0]}>
        <torusGeometry args={[2.0, 0.05, 8, 64]} />
        <meshStandardMaterial color="#c0a060" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Centre cone */}
      <mesh position={[0, 0.95, 0]}>
        <coneGeometry args={[0.3, 0.2, 16]} />
        <meshStandardMaterial color="#c0a060" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Ball indicator */}
      {winningNumber !== null && !isSpinning && (
        <mesh position={[1.6, 0.95, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
        </mesh>
      )}
    </group>
  )
}

/** History display — last 10 numbers. */
function HistoryBoard({
  history,
}: {
  history: Array<{ number: number; colour: string }>
}) {
  return (
    <group position={[0, 0.86, 2.0]}>
      {history.slice(-10).map((entry, i) => {
        const colourMap: Record<string, string> = {
          red: '#e74c3c',
          black: '#2c3e50',
          green: '#27ae60',
        }
        return (
          <mesh key={i} position={[-2.25 + i * 0.5, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 16]} />
            <meshStandardMaterial color={colourMap[entry.colour] ?? '#333'} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Betting chip on the board. */
function BetChip({
  position,
  amount,
  colour = '#f39c12',
}: {
  position: [number, number, number]
  amount: number
  colour?: string
}) {
  if (amount <= 0) return null
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.1, 0.1, 0.04, 16]} />
      <meshStandardMaterial color={colour} />
    </mesh>
  )
}

const PLAYER_COLOURS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12']

export function RouletteScene() {
  const roulette = useStateSyncSelector(s => s.roulette) as RouletteGameState | undefined

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Table surface */}
      <mesh position={[0, 0.8, 0.5]} castShadow>
        <boxGeometry args={[5.0, 0.12, 3.0]} />
        <meshStandardMaterial color="#0d3d0d" />
      </mesh>

      {/* Wheel */}
      <RouletteWheel
        winningNumber={roulette?.winningNumber ?? null}
        spinState={roulette?.spinState ?? 'idle'}
      />

      {/* History board */}
      {roulette && (
        <HistoryBoard
          history={roulette.history.map(h => ({
            number: h.number,
            colour: h.colour,
          }))}
        />
      )}

      {/* Player bet chips on the board */}
      {roulette?.bets.map((bet, i) => {
        const playerIdx = roulette.players.findIndex(p => p.playerId === bet.playerId)
        return (
          <BetChip
            key={bet.id}
            position={[-2 + (i % 10) * 0.4, 0.88, 0.5 + Math.floor(i / 10) * 0.3]}
            amount={bet.amount}
            colour={PLAYER_COLOURS[playerIdx] ?? '#f39c12'}
          />
        )
      })}

      {/* Balanced lighting */}
      <ambientLight intensity={0.3} color="#f0e8e0" />
      <spotLight
        position={[0, 10, 2]}
        angle={0.4}
        penumbra={0.5}
        intensity={1.5}
        castShadow
        color="#ffe8c0"
      />
      <pointLight position={[-3, 5, 3]} intensity={0.3} color="#80c0c0" />
      <pointLight position={[3, 5, -3]} intensity={0.3} color="#c0c080" />
    </group>
  )
}
