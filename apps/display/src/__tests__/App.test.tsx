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
 * Smoke tests for the display client components.
 *
 * Full render tests require a mocked VGFProvider and transport,
 * so for the initial scaffold we verify that the component modules
 * export correctly and are callable functions.
 */
describe('Display components', () => {
  it('exports SceneRouter as a function component', async () => {
    const { SceneRouter } = await import('../components/scenes/SceneRouter.js')
    expect(SceneRouter).toBeDefined()
    expect(typeof SceneRouter).toBe('function')
  })

  it('exports LobbyScene as a function component', async () => {
    const { LobbyScene } = await import('../components/scenes/LobbyScene.js')
    expect(LobbyScene).toBeDefined()
    expect(typeof LobbyScene).toBe('function')
  })

  it('exports HoldemScene as a function component', async () => {
    const { HoldemScene } = await import('../components/scenes/HoldemScene.js')
    expect(HoldemScene).toBeDefined()
    expect(typeof HoldemScene).toBe('function')
  })

  it('exports CasinoHUD as a function component', async () => {
    const { CasinoHUD } = await import('../components/hud/CasinoHUD.js')
    expect(CasinoHUD).toBeDefined()
    expect(typeof CasinoHUD).toBe('function')
  })

  it('exports PokerTable as a function component', async () => {
    const { PokerTable } = await import('../components/PokerTable.js')
    expect(PokerTable).toBeDefined()
    expect(typeof PokerTable).toBe('function')
  })

  it('exports HUD as a function component', async () => {
    const { HUD } = await import('../components/HUD.js')
    expect(HUD).toBeDefined()
    expect(typeof HUD).toBe('function')
  })

  it('exports LobbyView as a function component', async () => {
    const { LobbyView } = await import('../components/LobbyView.js')
    expect(LobbyView).toBeDefined()
    expect(typeof LobbyView).toBe('function')
  })

  it('exports GameView as a function component', async () => {
    const { GameView } = await import('../components/GameView.js')
    expect(GameView).toBeDefined()
    expect(typeof GameView).toBe('function')
  })
})
