/**
 * Loading fallback rendered inside Suspense while game scene assets load.
 * Simple floor plane with ambient light so the canvas isn't blank.
 */
export function SceneLoadingFallback() {
  return (
    <group>
      <ambientLight intensity={0.3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  )
}
