/**
 * A placeholder 3D poker table.
 *
 * Comprises a green felt surface (cylinder) and a wooden rim (torus).
 * This will be replaced with a proper GLTF model or more detailed
 * procedural geometry later on.
 *
 * TODO: Add card positions on the table surface
 * TODO: Add chip stack positions per seat
 * TODO: Add dealer button mesh
 * TODO: Load and use the 52-card deck GLB model
 */
export function PokerTable() {
  return (
    <group>
      {/* Table surface — green felt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[3, 3, 0.15, 64]} />
        <meshStandardMaterial color="#1a6b3c" roughness={0.8} />
      </mesh>

      {/* Table rim — dark wood */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <torusGeometry args={[3, 0.12, 16, 64]} />
        <meshStandardMaterial color="#4a2810" roughness={0.6} />
      </mesh>

      {/* TODO: Add community card area (centre of table) */}
      {/* TODO: Add pot display area */}
    </group>
  )
}
