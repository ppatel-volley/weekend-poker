import { useEffect, useRef, useState, useCallback } from 'react'

export interface WakeLockResult {
  /** Whether the Wake Lock API is supported by the browser. */
  isSupported: boolean
  /** Whether a wake lock is currently held. */
  isActive: boolean
}

/**
 * Acquires a screen wake lock on mount and releases it on unmount.
 * Re-acquires the lock when the document becomes visible again.
 * Gracefully handles browsers that lack the API.
 */
export function useWakeLock(): WakeLockResult {
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [isActive, setIsActive] = useState(false)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  const acquire = useCallback(async () => {
    if (!isSupported) return
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      sentinelRef.current = sentinel
      setIsActive(true)
      sentinel.addEventListener('release', () => {
        setIsActive(false)
        sentinelRef.current = null
      })
    } catch {
      // Request can fail if document is not visible or permission denied
      setIsActive(false)
    }
  }, [isSupported])

  useEffect(() => {
    if (!isSupported) return

    acquire()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquire()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sentinelRef.current?.release()
    }
  }, [isSupported, acquire])

  return { isSupported, isActive }
}
