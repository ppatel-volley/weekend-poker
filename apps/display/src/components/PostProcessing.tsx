import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

/**
 * Post-processing pass — bloom for chip/card highlights and a vignette
 * to draw the eye toward the centre of the table.
 */
export function PostProcessing() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.8}
        intensity={0.35}
        radius={0.6}
        levels={4}
      />
      <Vignette offset={0.3} darkness={0.65} />
    </EffectComposer>
  )
}
