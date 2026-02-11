import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace } from 'three'
import type { PokerPhase } from '@weekend-poker/shared'
import { PokerTable } from './PokerTable.js'
import { Lighting } from './Lighting.js'
import { CameraRig } from './CameraRig.js'
import { PostProcessing } from './PostProcessing.js'
import { CardDeckProvider } from './CardDeck.js'
import { CommunityCards } from './CommunityCards.js'
import { PlayerSeats } from './PlayerSeats.js'
import { PotDisplay } from './PotDisplay.js'
import { DealerSpeechBubble } from './DealerSpeechBubble.js'
import { HUD } from './HUD.js'

/**
 * Main 3D game view rendered via React Three Fibre.
 *
 * The Canvas fills the entire viewport with PCFSoftShadowMap shadows,
 * ACES Filmic tone mapping, and sRGB output. A 2D HUD overlay is
 * positioned absolutely on top to display phase, pot, and dealer messages.
 *
 * CardDeckProvider wraps the 3D scene so that CommunityCards (and
 * future hole-card displays) can access card mesh clones via context.
 */
export function GameView({ phase }: { phase: PokerPhase }) {
  return (
    <>
      <Canvas
        shadows={{ type: PCFShadowMap }}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace,
          powerPreference: 'high-performance',
        }}
        dpr={1}
        camera={{ fov: 45, near: 0.1, far: 100, position: [0, 8, 10] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <Lighting />
          <CameraRig phase={phase} />

          <CardDeckProvider>
            <PokerTable />
            <CommunityCards />
            <PlayerSeats />
            <PotDisplay />
            <DealerSpeechBubble />
          </CardDeckProvider>

          {/* Particles */}

          <PostProcessing />
        </Suspense>
      </Canvas>

      <HUD phase={phase} />
    </>
  )
}
