import { describe, it, expect, vi } from 'vitest'

// Mock R3F and drei to avoid react-reconciler incompatibility with React 19 in tests
vi.mock('@react-three/fiber', () => ({
  Canvas: vi.fn(({ children }) => children),
}))
vi.mock('@react-three/drei', () => ({
  OrbitControls: vi.fn(() => null),
  Environment: vi.fn(() => null),
}))

/**
 * Smoke tests for the display client components.
 *
 * Full render tests require a mocked VGFProvider and transport,
 * so for the initial scaffold we verify that the component modules
 * export correctly and are callable functions.
 *
 * TODO: Add proper render tests with a mocked VGFProvider
 * TODO: Add React Three Fibre render tests using @react-three/test-renderer
 */
describe('Display components', () => {
  it('exports PhaseRouter as a function component', async () => {
    const { PhaseRouter } = await import('../components/PhaseRouter.js')
    expect(PhaseRouter).toBeDefined()
    expect(typeof PhaseRouter).toBe('function')
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
