/**
 * Three Card Poker scene — "The Express".
 * Placeholder: floor + sleek balanced lighting + table.
 */
export function ThreeCardPokerScene() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Placeholder table */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[2.2, 2.2, 0.12, 32]} />
        <meshStandardMaterial color="#1a3a3a" />
      </mesh>

      {/* Balanced lighting (3000K feel) */}
      <ambientLight intensity={0.3} color="#f0e8e0" />
      <spotLight
        position={[0, 8, 2]}
        angle={0.5}
        penumbra={0.5}
        intensity={1.3}
        castShadow
        color="#e0e8f0"
      />
      <pointLight position={[-3, 5, 3]} intensity={0.3} color="#80c0c0" />
      <pointLight position={[3, 5, -3]} intensity={0.3} color="#c0c0c0" />
    </group>
  )
}
