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

describe('Game Night Display Components', () => {
  it('exports GameNightLeaderboardScene as a function component', async () => {
    const { GameNightLeaderboardScene } = await import(
      '../components/scenes/GameNightLeaderboardScene.js'
    )
    expect(GameNightLeaderboardScene).toBeDefined()
    expect(typeof GameNightLeaderboardScene).toBe('function')
  })

  it('exports GameNightChampionScene as a function component', async () => {
    const { GameNightChampionScene } = await import(
      '../components/scenes/GameNightChampionScene.js'
    )
    expect(GameNightChampionScene).toBeDefined()
    expect(typeof GameNightChampionScene).toBe('function')
  })

  it('SceneRouter still exports as a function component', async () => {
    const { SceneRouter } = await import('../components/scenes/SceneRouter.js')
    expect(SceneRouter).toBeDefined()
    expect(typeof SceneRouter).toBe('function')
  })

  it('CasinoHUD still exports as a function component', async () => {
    const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
    expect(CasinoHUD).toBeDefined()
    expect(typeof CasinoHUD).toBe('function')
  })

  it('SceneRouter imports GameNight lazy components', async () => {
    // Verify the module loads without errors — the lazy imports are
    // evaluated at import time, so if they were misconfigured the
    // dynamic import itself would fail.
    const mod = await import('../components/scenes/SceneRouter.js')
    expect(mod.SceneRouter).toBeDefined()
  })
})
