/**
 * Isolated R3F Canvas for rendering 3D cards on the controller.
 * Transparent background so it layers over the controller UI.
 * Optional bloom post-processing for glow effect.
 */

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { CardDeckProvider } from './CardDeckProvider.js'

export function CardCanvas({
  children,
  height = 160,
  bloom = true,
}: {
  children: React.ReactNode
  height?: number
  bloom?: boolean
}) {
  return (
    <div
      data-testid="card-canvas"
      style={{
        width: '100%',
        height: `${height}px`,
        touchAction: 'none',
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 3, 2.5], fov: 40 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 2]} intensity={1.2} />
        <Suspense fallback={null}>
          <CardDeckProvider>
            {children}
          </CardDeckProvider>
        </Suspense>
        {bloom && (
          <EffectComposer>
            <Bloom
              intensity={0.3}
              luminanceThreshold={0.8}
              luminanceSmoothing={0.3}
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
