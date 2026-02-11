import React from 'react'
import { Text } from '@react-three/drei'
import type { PokerPlayer } from '@weekend-poker/shared'
import { SEAT_POSITIONS, ACTION_COLOURS, ACTION_LABELS } from '../constants/sceneConstants.js'

// ── Types ────────────────────────────────────────────────────────

interface PlayerSeatProps {
  player: PokerPlayer
  seatIndex: number
  isActive: boolean
}

// ── Component ────────────────────────────────────────────────────

function PlayerSeatInner({ player, seatIndex, isActive }: PlayerSeatProps) {
  const seatPos = SEAT_POSITIONS[seatIndex] ?? [0, 0, 0]
  const actionKey = player.lastAction ?? 'waiting'
  const actionColour = ACTION_COLOURS[actionKey] ?? ACTION_COLOURS['waiting']!
  const actionLabel = ACTION_LABELS[actionKey] ?? ''

  return (
    <group position={[seatPos[0], seatPos[1] + 0.8, seatPos[2]]}>
      {/* Background panel */}
      <mesh>
        <planeGeometry args={[1.2, 0.6]} />
        <meshStandardMaterial
          color={isActive ? '#245838' : '#1B4D2E'}
          roughness={0.85}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Player name */}
      <Text
        position={[-0.5, 0.12, 0.01]}
        fontSize={0.08}
        color="#F5F2ED"
        anchorX="left"
        anchorY="middle"
      >
        {player.name}
      </Text>

      {/* Chip count */}
      <Text
        position={[-0.5, -0.02, 0.01]}
        fontSize={0.1}
        color="#C9A84C"
        anchorX="left"
        anchorY="middle"
      >
        {`$${player.stack.toLocaleString()}`}
      </Text>

      {/* Action indicator strip */}
      <mesh position={[0, -0.22, 0.01]}>
        <planeGeometry args={[1.2, 0.14]} />
        <meshStandardMaterial color={actionColour} roughness={0.9} />
      </mesh>

      {/* Action label */}
      {actionLabel !== '' && (
        <Text
          position={[0, -0.22, 0.02]}
          fontSize={0.06}
          color="#F5F2ED"
          anchorX="center"
          anchorY="middle"
        >
          {actionLabel}
        </Text>
      )}
    </group>
  )
}

/** Memoised player seat — only re-renders when relevant fields change. */
export const PlayerSeat = React.memo(PlayerSeatInner, (prev, next) => {
  return (
    prev.player.stack === next.player.stack &&
    prev.player.status === next.player.status &&
    prev.player.bet === next.player.bet &&
    prev.player.lastAction === next.player.lastAction &&
    prev.isActive === next.isActive &&
    prev.seatIndex === next.seatIndex
  )
})
