import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { InputModeProvider, useInputMode, InputModeContext } from '../platform/InputModeProvider.js'
import { PlatformContext } from '../platform/PlatformContext.js'
import type { PlatformDetectionResult } from '@weekend-casino/shared'

// Mock R3F to avoid reconciler issues in test env
vi.mock('@react-three/fiber', () => ({
  Canvas: vi.fn(({ children }) => children),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { lerp: vi.fn() }, lookAt: vi.fn(), fov: 45, updateProjectionMatrix: vi.fn() },
  })),
}))

/** Helper component that displays the current input mode. */
function InputModeDisplay() {
  const { inputMode, setInputMode } = useInputMode()
  return (
    <div>
      <span data-testid="input-mode">{inputMode}</span>
      <button data-testid="set-voice" onClick={() => setInputMode('voice')}>
        Set Voice
      </button>
    </div>
  )
}

function renderWithPlatform(
  platform: Partial<PlatformDetectionResult> = {},
) {
  const defaultPlatform: PlatformDetectionResult = {
    platform: 'BROWSER',
    isTV: false,
    defaultInputMode: 'touch',
    sdkAvailable: false,
    ...platform,
  }

  return render(
    <PlatformContext value={defaultPlatform}>
      <InputModeProvider>
        <InputModeDisplay />
      </InputModeProvider>
    </PlatformContext>,
  )
}

describe('InputModeProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('initialises with platform defaultInputMode (touch for BROWSER)', () => {
    renderWithPlatform()
    expect(screen.getByTestId('input-mode').textContent).toBe('touch')
  })

  it('initialises with remote for TV platforms', () => {
    renderWithPlatform({
      platform: 'FIRE_TV',
      isTV: true,
      defaultInputMode: 'remote',
    })
    expect(screen.getByTestId('input-mode').textContent).toBe('remote')
  })

  it('switches to remote on keydown', () => {
    renderWithPlatform()
    expect(screen.getByTestId('input-mode').textContent).toBe('touch')

    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowUp' })
    })

    expect(screen.getByTestId('input-mode').textContent).toBe('remote')
  })

  it('switches to touch on touchstart', () => {
    renderWithPlatform({
      platform: 'FIRE_TV',
      isTV: true,
      defaultInputMode: 'remote',
    })
    expect(screen.getByTestId('input-mode').textContent).toBe('remote')

    act(() => {
      fireEvent.touchStart(window)
    })

    expect(screen.getByTestId('input-mode').textContent).toBe('touch')
  })

  it('allows manual setInputMode to voice', () => {
    renderWithPlatform()
    expect(screen.getByTestId('input-mode').textContent).toBe('touch')

    act(() => {
      fireEvent.click(screen.getByTestId('set-voice'))
    })

    expect(screen.getByTestId('input-mode').textContent).toBe('voice')
  })

  it('switches from voice to remote on keydown', () => {
    renderWithPlatform()

    // First set to voice
    act(() => {
      fireEvent.click(screen.getByTestId('set-voice'))
    })
    expect(screen.getByTestId('input-mode').textContent).toBe('voice')

    // Then keydown should switch to remote
    act(() => {
      fireEvent.keyDown(window, { key: 'Enter' })
    })
    expect(screen.getByTestId('input-mode').textContent).toBe('remote')
  })

  it('switches to voice on voiceActivity custom event', () => {
    renderWithPlatform()
    expect(screen.getByTestId('input-mode').textContent).toBe('touch')

    act(() => {
      window.dispatchEvent(new CustomEvent('voiceActivity'))
    })

    expect(screen.getByTestId('input-mode').textContent).toBe('voice')
  })

  it('prefers explicit defaultMode prop over platform defaultInputMode', () => {
    const platform: PlatformDetectionResult = {
      platform: 'FIRE_TV',
      isTV: true,
      defaultInputMode: 'remote',
      sdkAvailable: false,
    }

    render(
      <PlatformContext value={platform}>
        <InputModeProvider defaultMode="voice">
          <InputModeDisplay />
        </InputModeProvider>
      </PlatformContext>,
    )

    expect(screen.getByTestId('input-mode').textContent).toBe('voice')
  })

  it('cleans up event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderWithPlatform()

    const addedEvents = addSpy.mock.calls.map(([event]) => event)
    expect(addedEvents).toContain('keydown')
    expect(addedEvents).toContain('touchstart')
    expect(addedEvents).toContain('voiceActivity')

    unmount()

    const removedEvents = removeSpy.mock.calls.map(([event]) => event)
    expect(removedEvents).toContain('keydown')
    expect(removedEvents).toContain('touchstart')
    expect(removedEvents).toContain('voiceActivity')
  })

  it('cycles through all three modes as events fire', () => {
    renderWithPlatform()

    // Start: touch
    expect(screen.getByTestId('input-mode').textContent).toBe('touch')

    // Keydown -> remote
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowDown' })
    })
    expect(screen.getByTestId('input-mode').textContent).toBe('remote')

    // Voice -> voice
    act(() => {
      window.dispatchEvent(new CustomEvent('voiceActivity'))
    })
    expect(screen.getByTestId('input-mode').textContent).toBe('voice')

    // Touch -> touch
    act(() => {
      fireEvent.touchStart(window)
    })
    expect(screen.getByTestId('input-mode').textContent).toBe('touch')
  })
})

describe('useInputMode without provider', () => {
  it('returns default touch mode when used outside provider', () => {
    render(<InputModeDisplay />)
    expect(screen.getByTestId('input-mode').textContent).toBe('touch')
  })
})

describe('InputModeContext export', () => {
  it('is exported and available as a context', () => {
    expect(InputModeContext).toBeDefined()
    expect(typeof InputModeContext).toBe('object')
  })
})
