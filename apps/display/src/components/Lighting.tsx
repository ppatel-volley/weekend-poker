import { Environment } from '@react-three/drei'

/**
 * Scene lighting rig — warm overhead key light with cool rim accents.
 *
 * Key light: Warm pendant SpotLight (~3000K) centred above the table,
 * casting soft shadows onto the felt surface.
 *
 * Rim lights: Two cool-toned DirectionalLights providing subtle edge
 * separation on players and chips.
 *
 * Ambient: HemisphereLight for gentle fill so shadows never go fully black.
 *
 * HDRI: Apartment preset at low intensity for realistic reflections on
 * metallic surfaces (chips, card foil).
 */
export function Lighting() {
  return (
    <>
      {/* Key light — warm overhead pendant */}
      <spotLight
        position={[0, 6, 0]}
        angle={Math.PI / 4}
        penumbra={0.5}
        intensity={2.5}
        color="#FFD7A3"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
      />

      {/* Rim light — right side, cool highlight */}
      <directionalLight
        position={[5, 4, -3]}
        intensity={0.3}
        color="#D4E5FF"
      />

      {/* Rim light — left side, cool highlight */}
      <directionalLight
        position={[-5, 4, -3]}
        intensity={0.3}
        color="#D4E5FF"
      />

      {/* Ambient fill — warm sky, dark ground */}
      <hemisphereLight args={['#FFD7A3', '#1A1A1D', 0.15]} />

      {/* HDRI environment for reflections (no background rendering) */}
      <Environment preset="apartment" environmentIntensity={0.15} />
    </>
  )
}
