import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDeviceInfo } from '@volley/platform-sdk/react'
import { usePlatformDeviceId } from '../hooks/usePlatformDeviceId.js'

describe('usePlatformDeviceId', () => {
  it('returns platform device ID when available', () => {
    const { result } = renderHook(() => usePlatformDeviceId())
    expect(result.current).toBe('test-device-id')
  })

  it('falls back to localStorage when platform returns empty', () => {
    vi.mocked(useDeviceInfo).mockReturnValueOnce({
      getDeviceId: () => '',
    } as unknown as ReturnType<typeof useDeviceInfo>)

    const { result } = renderHook(() => usePlatformDeviceId())
    expect(result.current).toBeTruthy()
    expect(result.current).not.toBe('test-device-id')
  })

  it('falls back when platform throws', () => {
    vi.mocked(useDeviceInfo).mockReturnValueOnce({
      getDeviceId: () => { throw new Error('not init') },
    } as unknown as ReturnType<typeof useDeviceInfo>)

    const { result } = renderHook(() => usePlatformDeviceId())
    expect(result.current).toBeTruthy()
  })
})
