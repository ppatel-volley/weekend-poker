import { describe, it, expect, vi } from 'vitest'

// Mock R3F, drei, and postprocessing to avoid react-reconciler
// incompatibility with React 19 in the test environment.
vi.mock('@react-three/fiber', () => ({
  Canvas: vi.fn(({ children }) => children),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { lerp: vi.fn() }, lookAt: vi.fn(), fov: 45, updateProjectionMatrix: vi.fn() },
  })),
}))
vi.mock('@react-three/drei', () => ({
  OrbitControls: vi.fn(() => null),
  Environment: vi.fn(() => null),
  Text: vi.fn(() => null),
  Float: vi.fn(({ children }) => children),
  MeshReflectorMaterial: vi.fn(() => null),
  Sparkles: vi.fn(() => null),
  useGLTF: Object.assign(vi.fn(() => ({ scene: { traverse: vi.fn() } })), {
    preload: vi.fn(),
  }),
}))
vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: vi.fn(({ children }) => children),
  Bloom: vi.fn(() => null),
  Vignette: vi.fn(() => null),
}))

/**
 * SceneRouter tests.
 *
 * The SceneRouter component depends on VGF hooks (useCurrentGame, usePhase) which require
 * a full VGFProvider, connection, and state store. Full integration tests with routing logic
 * should be done with the complete VGF test harness once the infrastructure is in place.
 *
 * For now, verify component exports correctly.
 */
describe('SceneRouter', () => {
  it('exports SceneRouter as a function component', async () => {
    const { SceneRouter } = await import('../components/scenes/SceneRouter.js')
    expect(SceneRouter).toBeDefined()
    expect(typeof SceneRouter).toBe('function')
  })
})
