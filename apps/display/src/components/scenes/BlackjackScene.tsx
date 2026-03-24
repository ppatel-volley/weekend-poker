/**
 * Blackjack scene — "The Floor".
 *
 * Premium casino environment: textured felt table, walnut hardwood floor,
 * art-deco walls, pendant lights, warm three-tier lighting, and post-processing.
 *
 * Dealer position at top, up to 4 player positions in arc.
 * Dealer hand: first card face up, second face down until reveal.
 * Player hands: both cards face up.
 * Hand value display, bust/blackjack/push indicators.
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { RepeatWrapping } from 'three'
import type { Mesh } from 'three'
import { useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import { CardDeckProvider, useCardDeck } from '../CardDeck.js'
import type { BlackjackGameState, BlackjackPlayerState } from '@weekend-casino/shared'
import type { Card } from '@weekend-casino/shared'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Card scale: GLB cards are ~100 units tall. 0.012 makes them ~1.2 units = good table size. */
const CARD_SCALE: [number, number, number] = [0.012, 0.012, 0.012]

/** Player seat positions in an arc across the bottom of the table. */
const SEAT_POSITIONS: [number, number, number][] = [
  [-2.0, 0.86, 1.5],
  [-0.7, 0.86, 2.0],
  [0.7, 0.86, 2.0],
  [2.0, 0.86, 1.5],
]

/** Texture base path (relative to public). */
const TEX = '/assets/blackjack/textures'

/** Chip denomination colours. */
const CHIP_COLOURS = ['#f39c12', '#e74c3c', '#3498db', '#9b59b6', '#27ae60'] as const

/* ------------------------------------------------------------------ */
/*  Texture paths — loaded once in SceneTextures                       */
/* ------------------------------------------------------------------ */

const TEXTURE_PATHS = {
  felt: `${TEX}/felt-green.jpg`,
  feltNormal: `${TEX}/felt-normal.jpg`,
  walnut: `${TEX}/walnut-floor.jpg`,
  wallPanels: `${TEX}/wall-panels.jpg`,
  leather: `${TEX}/leather-cognac.jpg`,
  cityBokeh: `${TEX}/city-bokeh.jpg`,
  persianRug: `${TEX}/persian-rug.jpg`,
}

/* ------------------------------------------------------------------ */
/*  Game-state components (cards, chips, status, players, dealer)       */
/* ------------------------------------------------------------------ */

/** 3D card model from the GLB deck. */
function CardModel({
  card,
  faceUp = false,
  position,
}: {
  card: Card
  faceUp?: boolean
  position: [number, number, number]
}) {
  const { getCardClone, ready } = useCardDeck()
  const clone = useMemo(() => ready ? getCardClone(card) : null, [ready, card.rank, card.suit, getCardClone])

  if (!clone) return null

  return (
    <primitive
      object={clone}
      position={position}
      rotation={faceUp ? [-Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, Math.PI]}
      scale={CARD_SCALE}
      castShadow
    />
  )
}

/** Chip stack visualisation with colour variation per denomination tier. */
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

  // Determine chip colour based on amount tiers
  const chipColour = amount >= 500
    ? CHIP_COLOURS[3]
    : amount >= 100
      ? CHIP_COLOURS[2]
      : amount >= 50
        ? CHIP_COLOURS[1]
        : colour

  return (
    <mesh
      position={[position[0], position[1] + height / 2, position[2]]}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[0.15, 0.15, height, 16]} />
      <meshStandardMaterial
        color={chipColour}
        roughness={0.4}
        metalness={0.3}
      />
    </mesh>
  )
}

/** Status indicator (bust/blackjack/push). */
function StatusIndicator({
  position,
  colour,
}: {
  position: [number, number, number]
  text?: string
  colour: string
}) {
  return (
    <mesh position={position}>
      <planeGeometry args={[0.8, 0.25]} />
      <meshStandardMaterial
        color={colour}
        emissive={colour}
        emissiveIntensity={0.5}
        toneMapped={false}
      />
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
      {hand.cards.map((card, i) => (
        <CardModel
          key={`${card.rank}-${card.suit}-${i}`}
          card={card}
          position={[(i - (hand.cards.length - 1) / 2) * 0.8, 0, 0]}
          faceUp
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
          <meshStandardMaterial
            color="#3498db"
            emissive="#3498db"
            emissiveIntensity={0.3}
          />
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
    <group position={[0, 0.86, -0.8]}>
      {/* Dealer cards */}
      {hasCards && dealer.cards.map((card, i) => (
        <CardModel
          key={`${card.rank}-${card.suit}-${i}`}
          card={card}
          position={[(i - (dealer.cards.length - 1) / 2) * 0.8, 0, 0]}
          faceUp={i === 0 || dealer.holeCardRevealed}
        />
      ))}

      {/* Dealer value / bust indicator */}
      {dealer.holeCardRevealed && (
        <mesh position={[0, 0.1, -0.5]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshStandardMaterial
            color={dealer.busted ? '#c0392b' : '#27ae60'}
            emissive={dealer.busted ? '#c0392b' : '#27ae60'}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}

      {/* Blackjack indicator */}
      {dealer.isBlackjack && dealer.holeCardRevealed && (
        <mesh position={[0, 0.15, -0.8]}>
          <planeGeometry args={[1.2, 0.25]} />
          <meshStandardMaterial
            color="#f1c40f"
            emissive="#f1c40f"
            emissiveIntensity={0.6}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Environment components                                             */
/* ------------------------------------------------------------------ */

/** Premium blackjack table: felt surface, leather rail, wood rim, brass accents. */
function CasinoTable() {
  const textures = useTexture(TEXTURE_PATHS)

  // Configure felt texture for tiling
  const feltMap = textures.felt
  feltMap.wrapS = RepeatWrapping
  feltMap.wrapT = RepeatWrapping
  feltMap.repeat.set(2, 2)

  const feltNormalMap = textures.feltNormal
  feltNormalMap.wrapS = RepeatWrapping
  feltNormalMap.wrapT = RepeatWrapping
  feltNormalMap.repeat.set(2, 2)

  // Leather for the rail
  const leatherMap = textures.leather
  leatherMap.wrapS = RepeatWrapping
  leatherMap.wrapT = RepeatWrapping
  leatherMap.repeat.set(4, 1)

  return (
    <group>
      {/* ---- Felt surface (the hero) ---- */}
      <mesh position={[0, 0.8, 0.5]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.45, 3.45, 0.08, 48, 1, false, 0, Math.PI]} />
        <meshStandardMaterial
          map={feltMap}
          normalMap={feltNormalMap}
          normalScale={[0.8, 0.8] as unknown as import('three').Vector2}
          color="#1B4D2E"
          roughness={0.88}
          metalness={0.0}
        />
      </mesh>

      {/* ---- Brass accent strip (between felt and rail) ---- */}
      <mesh position={[0, 0.82, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[3.48, 3.48, 0.03, 48, 1, false, 0, Math.PI]} />
        <meshStandardMaterial
          color="#C9A84C"
          metalness={0.9}
          roughness={0.25}
          emissive="#C9A84C"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* ---- Padded leather rail ---- */}
      <mesh position={[0, 0.84, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[3.55, 3.55, 0.12, 48, 1, false, 0, Math.PI]} />
        <meshStandardMaterial
          map={leatherMap}
          color="#8B4513"
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>

      {/* ---- Wood rim (outer edge with lacquer sheen) ---- */}
      <mesh position={[0, 0.8, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[3.62, 3.62, 0.15, 48, 1, false, 0, Math.PI]} />
        <meshPhysicalMaterial
          color="#4A1C0A"
          roughness={0.35}
          metalness={0.1}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
        />
      </mesh>

      {/* ---- Betting circles (gold-embossed on felt) ---- */}
      {SEAT_POSITIONS.map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.87, pos[2] - 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.3, 32]} />
          <meshStandardMaterial
            color="#C9A84C"
            emissive="#C9A84C"
            emissiveIntensity={0.15}
            metalness={0.7}
            roughness={0.35}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Dark walnut hardwood floor. */
function HardwoodFloor() {
  const textures = useTexture(TEXTURE_PATHS)

  const walnutMap = textures.walnut
  walnutMap.wrapS = RepeatWrapping
  walnutMap.wrapT = RepeatWrapping
  walnutMap.repeat.set(6, 6)

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial
        map={walnutMap}
        color="#3a2210"
        roughness={0.4}
        metalness={0.05}
      />
    </mesh>
  )
}

/** Persian rug under the table. */
function PersianRug() {
  const textures = useTexture(TEXTURE_PATHS)

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 1.0]} receiveShadow>
      <planeGeometry args={[9, 7]} />
      <meshStandardMaterial
        map={textures.persianRug}
        roughness={0.85}
        metalness={0.0}
      />
    </mesh>
  )
}

/** Partial room shell — back and side walls with art-deco panels. */
function RoomWalls() {
  const textures = useTexture(TEXTURE_PATHS)

  const wallMap = textures.wallPanels
  wallMap.wrapS = RepeatWrapping
  wallMap.wrapT = RepeatWrapping
  wallMap.repeat.set(3, 2)

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 4, -6]} receiveShadow>
        <planeGeometry args={[24, 10]} />
        <meshStandardMaterial
          map={wallMap}
          color="#2a2a30"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Left wall */}
      <mesh position={[-10, 4, 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial
          map={wallMap}
          color="#2a2a30"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Right wall */}
      <mesh position={[10, 4, 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[18, 10]} />
        <meshStandardMaterial
          map={wallMap}
          color="#2a2a30"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
    </group>
  )
}

/** Tall window with city bokeh backplate and a warm glow bleed. */
function CityWindow() {
  const textures = useTexture(TEXTURE_PATHS)

  return (
    <group position={[-6, 3.5, -5.9]}>
      {/* Dark frame */}
      <mesh>
        <boxGeometry args={[3.2, 5.2, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.3} />
      </mesh>

      {/* City bokeh emissive backplate */}
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[2.8, 4.8]} />
        <meshStandardMaterial
          map={textures.cityBokeh}
          emissiveMap={textures.cityBokeh}
          emissive="#ffffff"
          emissiveIntensity={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Warm light bleed from window */}
      <pointLight
        position={[0, 0, 1]}
        color="#FFE4C4"
        intensity={0.4}
        distance={8}
        decay={2}
      />
    </group>
  )
}

/** Hanging pendant light fixture — brass body with emissive glow. */
function PendantLight({
  position,
}: {
  position: [number, number, number]
}) {
  const glowRef = useRef<Mesh>(null)

  // Subtle warm pulse
  useFrame(({ clock }) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as import('three').MeshStandardMaterial
      mat.emissiveIntensity = 1.8 + Math.sin(clock.getElapsedTime() * 0.5) * 0.2
    }
  })

  return (
    <group position={position}>
      {/* Brass fixture body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.3, 0.2, 16]} />
        <meshStandardMaterial
          color="#C9A84C"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Hanging rod */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.0, 8]} />
        <meshStandardMaterial
          color="#C9A84C"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Emissive bulb / shade */}
      <mesh ref={glowRef} position={[0, -0.15, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#FFE4C4"
          emissive="#FFE4C4"
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </mesh>

      {/* Actual light from pendant */}
      <spotLight
        position={[0, -0.2, 0]}
        target-position={[position[0], 0, position[2]]}
        angle={0.9}
        penumbra={0.7}
        intensity={1.5}
        color="#FFE4C4"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0005}
        distance={12}
        decay={2}
      />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Lighting rig — three-tier model                                    */
/* ------------------------------------------------------------------ */

function CasinoLighting() {
  return (
    <>
      {/* ---- Tier 1: Ambient fill — HemisphereLight ---- */}
      <hemisphereLight
        color="#B0C4DE"
        groundColor="#FFE4C4"
        intensity={0.15}
      />

      {/* ---- Tier 2: Key light — warm overhead spot ---- */}
      <spotLight
        position={[0, 7, 1]}
        angle={0.7}
        penumbra={0.5}
        intensity={2.5}
        castShadow
        color="#FFE4C4"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
      />

      {/* ---- Tier 3: Rim / accent lights — cool edge highlights ---- */}
      <directionalLight
        position={[-5, 6, -3]}
        intensity={0.3}
        color="#E0EEFF"
      />
      <directionalLight
        position={[5, 6, -3]}
        intensity={0.3}
        color="#E0EEFF"
      />

      {/* Fill from camera direction — very subtle */}
      <pointLight
        position={[0, 3, 6]}
        intensity={0.3}
        color="#FFE4C4"
        distance={15}
        decay={2}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main scene                                                         */
/* ------------------------------------------------------------------ */

export function BlackjackScene() {
  const bj = useStateSyncSelector(s => s.blackjack) as BlackjackGameState | undefined

  return (
    <group>
      {/* ---- Environment ---- */}
      <HardwoodFloor />
      <PersianRug />
      <RoomWalls />
      <CityWindow />

      {/* ---- Pendant lights above the table ---- */}
      <PendantLight position={[-1.5, 5.5, 0.5]} />
      <PendantLight position={[0, 5.8, 0.2]} />
      <PendantLight position={[1.5, 5.5, 0.5]} />

      {/* ---- The table (hero element) ---- */}
      <CasinoTable />

      {/* ---- Game state objects ---- */}
      <CardDeckProvider>
        {/* Dealer area — centred at top of table */}
        {bj && <DealerArea bj={bj} />}

        {/* Player positions — arc across bottom */}
        {bj?.playerStates.map((ps, i) => (
          <PlayerPosition
            key={ps.playerId}
            playerState={ps}
            seatPosition={SEAT_POSITIONS[i] ?? SEAT_POSITIONS[0]!}
          />
        ))}
      </CardDeckProvider>

      {/* ---- Lighting rig ---- */}
      <CasinoLighting />

      {/* ---- Post-processing ---- */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.8}
          intensity={0.35}
          radius={0.6}
          levels={4}
        />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    </group>
  )
}
