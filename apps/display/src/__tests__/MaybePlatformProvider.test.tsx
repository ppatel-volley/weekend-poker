import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MaybePlatformProvider } from '../platform/MaybePlatformProvider.js'
import { usePlatform } from '../platform/PlatformContext.js'

// Mock R3F to avoid reconciler issues in test env
vi.mock('@react-three/fiber', () => ({
  Canvas: vi.fn(({ children }) => children),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { lerp: vi.fn() }, lookAt: vi.fn(), fov: 45, updateProjectionMatrix: vi.fn() },
  })),
}))

/** Helper component that renders platform info for testing. */
function PlatformDisplay() {
  const info = usePlatform()
  return (
    <div>
      <span data-testid="platform">{info.platform}</span>
      <span data-testid="is-tv">{String(info.isTV)}</span>
      <span data-testid="input-mode">{info.defaultInputMode}</span>
      <span data-testid="sdk">{String(info.sdkAvailable)}</span>
    </div>
  )
}

describe('MaybePlatformProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Ensure clean URL state
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '', href: 'http://localhost:5173/', pathname: '/' },
    })
  })

  it('provides detected platform info to children', () => {
    render(
      <MaybePlatformProvider>
        <PlatformDisplay />
      </MaybePlatformProvider>,
    )
    expect(screen.getByTestId('platform').textContent).toBe('BROWSER')
    expect(screen.getByTestId('is-tv').textContent).toBe('false')
    expect(screen.getByTestId('input-mode').textContent).toBe('touch')
  })

  it('sets sdkAvailable to false when SDK import fails', async () => {
    render(
      <MaybePlatformProvider>
        <PlatformDisplay />
      </MaybePlatformProvider>,
    )

    // Allow the dynamic import rejection to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(screen.getByTestId('sdk').textContent).toBe('false')
  })

  it('renders children correctly', () => {
    render(
      <MaybePlatformProvider>
        <div data-testid="child">Hello Casino</div>
      </MaybePlatformProvider>,
    )
    expect(screen.getByTestId('child').textContent).toBe('Hello Casino')
  })

  it('detects platform from URL param when provided', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '?volley_platform=FIRE_TV', href: 'http://localhost:5173/?volley_platform=FIRE_TV' },
    })

    render(
      <MaybePlatformProvider>
        <PlatformDisplay />
      </MaybePlatformProvider>,
    )

    expect(screen.getByTestId('platform').textContent).toBe('FIRE_TV')
    expect(screen.getByTestId('is-tv').textContent).toBe('true')
    expect(screen.getByTestId('input-mode').textContent).toBe('remote')
  })
})

describe('usePlatform without provider', () => {
  it('returns default BROWSER context when used outside provider', () => {
    render(<PlatformDisplay />)
    expect(screen.getByTestId('platform').textContent).toBe('BROWSER')
    expect(screen.getByTestId('is-tv').textContent).toBe('false')
    expect(screen.getByTestId('input-mode').textContent).toBe('touch')
    expect(screen.getByTestId('sdk').textContent).toBe('false')
  })
})
