import { useState } from 'react'

const DEVICE_TOKEN_KEY = 'weekend-casino-device-token'

let inMemoryToken: string | null = null

function generateFallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getOrCreateDeviceToken(): string {
  // Try localStorage first
  try {
    const stored = localStorage.getItem(DEVICE_TOKEN_KEY)
    if (stored) return stored
  } catch {
    // localStorage unavailable — fall through
  }

  // Return in-memory token if we already generated one
  if (inMemoryToken) return inMemoryToken

  // Generate new token
  let token: string
  try {
    token = crypto.randomUUID()
  } catch {
    token = generateFallbackUUID()
  }

  // Try to persist
  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, token)
  } catch {
    // Persist in-memory only
    inMemoryToken = token
  }

  return token
}

/**
 * Returns a persistent device token from localStorage.
 * @deprecated Use usePlatformDeviceId instead — this is kept as a fallback.
 */
export function useDeviceToken(): { deviceToken: string } {
  const [deviceToken] = useState(getOrCreateDeviceToken)
  return { deviceToken }
}
