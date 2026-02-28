import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Text, MeshReflectorMaterial, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import type { Group, Mesh, PointLight as PointLightType } from 'three'
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

/** Card suit definitions with colours for the orbiting symbols. */
const CARD_SUITS = [
  { symbol: '\u2660', colour: '#e0e0e0', emissive: '#8888aa' },   // Spade — silver glow
  { symbol: '\u2665', colour: '#ff3333', emissive: '#cc0000' },   // Heart — crimson glow
  { symbol: '\u2666', colour: '#ff8800', emissive: '#cc6600' },   // Diamond — amber glow
  { symbol: '\u2663', colour: '#e0e0e0', emissive: '#8888aa' },   // Club — silver glow
]

/**
 * Orbiting card suit symbols with emissive glow.
 * They slowly revolve around the centre whilst gently floating.
 */
function OrbitingSuits() {
  const groupRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      {CARD_SUITS.map((suit, i) => {
        const angle = (i / CARD_SUITS.length) * Math.PI * 2
        const radius = 6
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius

        return (
          <Float
            key={suit.symbol + i}
            speed={1.5 + i * 0.3}
            rotationIntensity={0.3}
            floatIntensity={0.8}
            floatingRange={[-0.3, 0.3]}
          >
            <group position={[x, 2.5 + (i % 2) * 0.5, z]}>
              <Text
                fontSize={2}
                color={suit.colour}
                anchorX="center"
                anchorY="middle"
              >
                {suit.symbol}
                <meshStandardMaterial
                  color={suit.colour}
                  emissive={suit.emissive}
                  emissiveIntensity={2.5}
                  toneMapped={false}
                />
              </Text>
            </group>
          </Float>
        )
      })}
    </group>
  )
}

/**
 * Rotating game card placeholder — each V1 game gets a glowing box.
 */
function GameCard({ game, index }: { game: CasinoGame; index: number }) {
  const meshRef = useRef<Mesh>(null)
  const xPos = (index - (V1_GAMES.length - 1) / 2) * 3

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
    }
  })

  const colour = GAME_CARD_COLOURS[game]

  return (
    <group position={[xPos, 1.5, 0]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1.8, 2.4, 0.2]} />
        <meshStandardMaterial
          color={colour}
          emissive={colour}
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* Label plane beneath the card */}
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
 * Animated accent point light that subtly pulses.
 */
function PulsingLight({ colour, position }: { colour: string; position: [number, number, number] }) {
  const lightRef = useRef<PointLightType>(null)

  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.getElapsedTime()
      lightRef.current.intensity = 0.6 + Math.sin(t * 0.8) * 0.3
    }
  })

  return <pointLight ref={lightRef} position={position} color={colour} intensity={0.6} distance={20} />
}

/**
 * The floating 3D casino title with emissive glow.
 * Wrapped in Float for gentle bobbing animation.
 */
function CasinoTitle() {
  return (
    <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.4} floatingRange={[-0.15, 0.15]}>
      <Text
        position={[0, 5.5, -2]}
        fontSize={1.4}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.15}
        font={undefined}
      >
        WEEKEND CASINO
        <meshStandardMaterial
          color="#d4af37"
          emissive="#d4af37"
          emissiveIntensity={3}
          toneMapped={false}
          roughness={0.2}
          metalness={0.8}
        />
      </Text>
    </Float>
  )
}

/**
 * Reflective ground plane with dark mirror finish.
 * Uses MeshReflectorMaterial from drei for real-time reflections.
 */
function ReflectiveFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <MeshReflectorMaterial
        mirror={0.4}
        blur={[300, 100]}
        resolution={512}
        mixBlur={1}
        mixStrength={0.6}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#050505"
        metalness={0.5}
      />
    </mesh>
  )
}

/**
 * Lobby 3D scene — premium casino atmosphere with bloom, reflections, and particles.
 *
 * Features:
 * - Reflective floor with real-time mirror material
 * - Floating emissive "WEEKEND CASINO" title
 * - Orbiting card suit symbols with glow
 * - Rotating game card placeholders for each V1 game
 * - Gold spotlight + emerald accent lighting
 * - Bloom post-processing for cinematic glow
 * - Sparkle particles for ambient atmosphere
 * - Vignette for dramatic framing
 */
export function LobbyScene() {
  return (
    <>
      <group>
        {/* Reflective floor */}
        <ReflectiveFloor />

        {/* Ambient — very low, let the dramatic lights do the work */}
        <ambientLight intensity={0.12} color="#1a1a2e" />

        {/* Gold spotlight from above — the hero light */}
        <spotLight
          position={[0, 12, 2]}
          angle={0.5}
          penumbra={0.7}
          intensity={3}
          castShadow
          color="#d4af37"
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />

        {/* Secondary warm fill from the front */}
        <spotLight
          position={[0, 8, 8]}
          angle={0.8}
          penumbra={0.6}
          intensity={1}
          color="#ffe8c4"
        />

        {/* Emerald accent point light — left side */}
        <PulsingLight colour="#00cc66" position={[-8, 4, -3]} />

        {/* Gold accent point light — right side */}
        <PulsingLight colour="#d4af37" position={[8, 4, -3]} />

        {/* Deep emerald backlight for depth */}
        <pointLight position={[0, 2, -10]} color="#006633" intensity={0.4} distance={25} />

        {/* Floating title */}
        <CasinoTitle />

        {/* Orbiting card suits */}
        <OrbitingSuits />

        {/* Game selection cards — v1 games */}
        {V1_GAMES.map((game, i) => (
          <GameCard key={game} game={game} index={i} />
        ))}

        {/* Ambient sparkle particles throughout the scene */}
        <Sparkles
          count={80}
          scale={[20, 10, 20]}
          size={2}
          speed={0.3}
          color="#d4af37"
          opacity={0.4}
        />

        {/* Secondary sparkle layer — cooler emerald tones */}
        <Sparkles
          count={40}
          scale={[15, 8, 15]}
          size={1.5}
          speed={0.2}
          color="#00cc88"
          opacity={0.25}
        />
      </group>

      {/* Post-processing: bloom for emissive glow + vignette for cinematic framing */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          intensity={1.5}
          radius={0.8}
          levels={5}
        />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}

// Re-export labels for use in 2D overlay if needed
export { CASINO_GAME_LABELS }
