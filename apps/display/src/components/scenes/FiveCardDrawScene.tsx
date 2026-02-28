/**
 * 5-Card Draw scene — "The Lounge".
 * Placeholder: floor + warm lighting + table box.
 */
export function FiveCardDrawScene() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a0f0a" />
      </mesh>

      {/* Placeholder table */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[2.5, 2.5, 0.15, 32]} />
        <meshStandardMaterial color="#2a1a0a" />
      </mesh>

      {/* Warm amber lighting (2400K feel) */}
      <ambientLight intensity={0.25} color="#ffe0b0" />
      <spotLight
        position={[0, 8, 0]}
        angle={0.5}
        penumbra={0.6}
        intensity={1.2}
        castShadow
        color="#ffcc80"
      />
      <pointLight position={[-3, 4, 2]} intensity={0.4} color="#ff9940" />
      <pointLight position={[3, 4, -2]} intensity={0.4} color="#ff9940" />
    </group>
  )
}
