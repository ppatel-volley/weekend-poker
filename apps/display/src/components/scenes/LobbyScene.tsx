import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { CASINO_GAME_LABELS, V1_GAMES } from '@weekend-casino/shared'
import type { CasinoGame } from '@weekend-casino/shared'

/** Colours for each game card placeholder in the lobby. */
const GAME_CARD_COLOURS: Record<CasinoGame, string> = {
  holdem: '#1a5c2a',
  five_card_draw: '#5c1a1a',
  blackjack_classic: '#1a3a5c',
  blackjack_competitive: '#1a1a1a',
  roulette: '#5c4a1a',
  three_card_poker: '#1a4a4a',
  craps: '#3a5c1a',
}

function GameCard({ game, index }: { game: CasinoGame; index: number }) {
  const meshRef = useRef<Mesh>(null)
  const xPos = (index - (V1_GAMES.length - 1) / 2) * 3

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  return (
    <group position={[xPos, 1.5, 0]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1.8, 2.4, 0.2]} />
        <meshStandardMaterial color={GAME_CARD_COLOURS[game]} />
      </mesh>
      {/* Game label rendered as a simple text placeholder via a small plane */}
      <mesh position={[0, -1.8, 0]}>
        <planeGeometry args={[2, 0.4]} />
        <meshStandardMaterial
          color="#2a2a2a"
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}

/**
 * Lobby 3D scene — displays game selection cards as rotating boxes.
 * Placeholder geometry until real game card previews are built.
 */
export function LobbyScene() {
  return (
    <group>
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Ambient + key lighting */}
      <ambientLight intensity={0.4} />
      <spotLight
        position={[0, 10, 5]}
        angle={0.6}
        penumbra={0.5}
        intensity={1.5}
        castShadow
        color="#ffe8c4"
      />
      <pointLight position={[-8, 6, -4]} intensity={0.3} color="#4a6fa5" />
      <pointLight position={[8, 6, -4]} intensity={0.3} color="#a54a4a" />

      {/* Game selection cards — v1 games only for now */}
      {V1_GAMES.map((game, i) => (
        <GameCard key={game} game={game} index={i} />
      ))}
    </group>
  )
}

// Re-export labels for use in 2D overlay if needed
export { CASINO_GAME_LABELS }
