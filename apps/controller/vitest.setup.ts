import { vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// ResizeObserver polyfill for jsdom — required by @react-three/fiber (via react-use-measure)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver
}

// Mock 3D card components — jsdom has no WebGL context.
// Uses a factory to defer React import until test runtime.
vi.mock('./src/components/3d/Hand3D.js', async () => {
  const React = await import('react')
  return {
    Hand3D: ({ cards }: { cards: unknown[] }) =>
      React.createElement('div', {
        'data-testid': 'card-canvas',
        'data-card-count': String(cards?.length ?? 0),
      }),
  }
})

// Global constants defined by Vite at build time
vi.stubGlobal('__APP_VERSION__', '0.0.0-test')

// Global mocks for platform SDK
vi.mock('@volley/platform-sdk/react', () => ({
  PlatformProvider: ({ children }: { children: React.ReactNode }) => children,
  useDeviceInfo: vi.fn(() => ({
    getDeviceId: () => 'test-device-id',
  })),
  useAppLifecycleState: vi.fn(() => 'active'),
  useCloseEvent: vi.fn(() => vi.fn()),
  useTracking: vi.fn(() => ({ track: vi.fn() })),
  usePlatformStatus: vi.fn(() => ({ isReady: true, error: null })),
}))
