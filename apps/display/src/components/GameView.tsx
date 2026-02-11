import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import type { PokerPhase } from '@weekend-poker/shared'
import { PokerTable } from './PokerTable.js'
import { HUD } from './HUD.js'

/**
 * Main 3D game view rendered via React Three Fibre.
 *
 * The Canvas fills the entire viewport. A 2D HUD overlay is positioned
 * absolutely on top to display phase, pot, and dealer messages.
 *
 * TODO: Add Theatre.js sheet for cinematic camera transitions between phases
 * TODO: Add card dealing animations
 * TODO: Add chip movement animations
 * TODO: Add player seat positions around the table
 */
export function GameView({ phase }: { phase: PokerPhase }) {
  return (
    <>
      <Canvas
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
        camera={{ position: [0, 8, 6], fov: 45 }}
        style={{ position: 'absolute', inset: 0 }}
        shadows
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

        <PokerTable />

        {/* TODO: Render player positions, cards, chips here */}

        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} />
        <Environment preset="apartment" background={false} />
      </Canvas>

      <HUD phase={phase} />
    </>
  )
}
