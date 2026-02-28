/**
 * Blackjack scene — "The Floor".
 * Used for both Classic and Competitive variants.
 * Placeholder: floor + bright glamorous lighting + semi-circle table.
 */
export function BlackjackScene() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>

      {/* Placeholder semi-circle table */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[3, 3, 0.12, 32, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#0a2a4a" />
      </mesh>

      {/* Bright, glamorous lighting (3500K feel) */}
      <ambientLight intensity={0.35} color="#fff5e6" />
      <spotLight
        position={[0, 8, 3]}
        angle={0.6}
        penumbra={0.4}
        intensity={1.5}
        castShadow
        color="#fffaf0"
      />
      <pointLight position={[-4, 5, 0]} intensity={0.3} color="#b0d0ff" />
      <pointLight position={[4, 5, 0]} intensity={0.3} color="#b0d0ff" />
    </group>
  )
}
