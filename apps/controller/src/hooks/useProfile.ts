import { useState, useEffect, useCallback } from 'react'
import type { PlayerProfile } from '@weekend-casino/shared'
import { useDeviceToken } from './useDeviceToken.js'

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

/** Fetches player profile from REST API using device token. */
export function useProfile(): {
  profile: PlayerProfile | null
  loading: boolean
  error: string | null
  refetch: () => void
} {
  const { deviceToken } = useDeviceToken()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${SERVER_URL}/api/profile/${encodeURIComponent(deviceToken)}`, {
        headers: { 'x-device-token': deviceToken },
      })
      if (!res.ok) {
        throw new Error(`Failed to load profile (${res.status})`)
      }
      const data = (await res.json()) as PlayerProfile
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [deviceToken])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, refetch: () => void fetchProfile() }
}
