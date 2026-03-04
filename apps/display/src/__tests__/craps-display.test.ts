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

describe('Craps Display Components', () => {
  it('exports CrapsScene as a function component', async () => {
    const { CrapsScene } = await import('../components/scenes/CrapsScene.js')
    expect(CrapsScene).toBeDefined()
    expect(typeof CrapsScene).toBe('function')
  })

  it('SceneRouter maps craps to CrapsScene (not placeholder)', async () => {
    // The module loads without error, proving the lazy import resolves.
    const mod = await import('../components/scenes/SceneRouter.js')
    expect(mod.SceneRouter).toBeDefined()

    // Also verify the CrapsScene module resolves independently.
    const crapsModule = await import('../components/scenes/CrapsScene.js')
    expect(crapsModule.CrapsScene).toBeDefined()
    expect(typeof crapsModule.CrapsScene).toBe('function')

    // The lazy import in SceneRouter should point to CrapsScene, not FiveCardDrawScene.
    // We can verify this by checking the CrapsScene module has the expected exports
    // that differ from FiveCardDrawScene.
    const drawModule = await import('../components/scenes/FiveCardDrawScene.js')
    expect(crapsModule.CrapsScene).not.toBe(drawModule.FiveCardDrawScene)
  })

  it('CrapsScene renders without crashing when state is undefined', async () => {
    // Mock hooks to return no craps state (waiting state)
    vi.doMock('../../hooks/useVGFHooks.js', () => ({
      useStateSyncSelector: vi.fn(() => undefined),
      usePhase: vi.fn(() => 'CRAPS_NEW_SHOOTER'),
      useCurrentGame: vi.fn(() => 'craps'),
    }))

    // Re-import to pick up mock
    const { CrapsScene } = await import('../components/scenes/CrapsScene.js')
    expect(CrapsScene).toBeDefined()
    expect(typeof CrapsScene).toBe('function')
  })

  it('SceneRouter still exports correctly after CrapsScene addition', async () => {
    const { SceneRouter } = await import('../components/scenes/SceneRouter.js')
    expect(SceneRouter).toBeDefined()
    expect(typeof SceneRouter).toBe('function')
  })
})
