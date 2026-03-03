import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpatialNavigationProvider } from '../platform/SpatialNavigationProvider.js'
import { PlatformContext } from '../platform/PlatformContext.js'
import type { PlatformDetectionResult } from '@weekend-casino/shared'

// Mock the norigin-spatial-navigation library
const mockInit = vi.fn()
const mockDestroy = vi.fn()

vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  destroy: (...args: unknown[]) => mockDestroy(...args),
  useFocusable: () => ({
    ref: { current: null },
    focusSelf: vi.fn(),
    focused: false,
    hasFocusedChild: false,
    focusKey: 'SN:ROOT',
  }),
}))

// Mock R3F
vi.mock('@react-three/fiber', () => ({
  Canvas: vi.fn(({ children }) => children),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { lerp: vi.fn() }, lookAt: vi.fn(), fov: 45, updateProjectionMatrix: vi.fn() },
  })),
}))

function renderWithPlatform(
  isTV: boolean,
) {
  const platform: PlatformDetectionResult = {
    platform: isTV ? 'FIRE_TV' : 'BROWSER',
    isTV,
    defaultInputMode: isTV ? 'remote' : 'touch',
    sdkAvailable: false,
  }

  return render(
    <PlatformContext value={platform}>
      <SpatialNavigationProvider>
        <div data-testid="child">Content</div>
      </SpatialNavigationProvider>
    </PlatformContext>,
  )
}

describe('SpatialNavigationProvider', () => {
  beforeEach(() => {
    mockInit.mockClear()
    mockDestroy.mockClear()
  })

  it('renders children regardless of platform', () => {
    renderWithPlatform(false)
    expect(screen.getByTestId('child').textContent).toBe('Content')
  })

  it('calls init when isTV is true', () => {
    renderWithPlatform(true)
    expect(mockInit).toHaveBeenCalledWith({
      debug: false,
      visualDebug: false,
    })
  })

  it('does not call init when isTV is false', () => {
    renderWithPlatform(false)
    expect(mockInit).not.toHaveBeenCalled()
  })

  it('calls destroy on unmount when isTV is true', () => {
    const { unmount } = renderWithPlatform(true)
    expect(mockDestroy).not.toHaveBeenCalled()
    unmount()
    expect(mockDestroy).toHaveBeenCalled()
  })

  it('does not call destroy on unmount when isTV is false', () => {
    const { unmount } = renderWithPlatform(false)
    unmount()
    expect(mockDestroy).not.toHaveBeenCalled()
  })
})
