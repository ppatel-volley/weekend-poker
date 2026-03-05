import { useMemo } from 'react'
import { useDeviceInfo } from '@volley/platform-sdk/react'

const DEVICE_TOKEN_KEY = 'weekend-casino-device-token'

// In-memory singleton — survives rerenders even when localStorage is unavailable
let cachedFallbackToken: string | null = null

function generateFallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getLocalStorageFallback(): string {
  if (cachedFallbackToken) return cachedFallbackToken

  try {
    const stored = localStorage.getItem(DEVICE_TOKEN_KEY)
    if (stored) {
      cachedFallbackToken = stored
      return stored
    }
  } catch {
    // localStorage unavailable
  }

  let token: string
  try {
    token = crypto.randomUUID()
  } catch {
    token = generateFallbackUUID()
  }

  cachedFallbackToken = token

  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, token)
  } catch {
    // localStorage unavailable — cachedFallbackToken holds it in memory
  }

  return token
}

/**
 * Returns a device identifier, preferring platform SDK's deviceInfo
 * when available, falling back to localStorage-based UUID.
 */
export function usePlatformDeviceId(): string {
  const deviceInfo = useDeviceInfo()

  return useMemo(() => {
    try {
      const id = deviceInfo.getDeviceId()
      if (id) return id
    } catch {
      // Platform SDK not initialised — fall through
    }
    return getLocalStorageFallback()
  }, [deviceInfo])
}
