import { useState, useEffect, type ReactNode } from 'react'
import type { PlatformDetectionResult } from '@weekend-casino/shared'
import { PlatformContext } from './PlatformContext.js'
import { detectPlatform } from './detectPlatform.js'

interface MaybePlatformProviderProps {
  children: ReactNode
}

/**
 * Wraps children with PlatformContext, detecting the platform on mount.
 *
 * Attempts a dynamic import of `@volley/platform-sdk`. If the SDK is
 * available, sets sdkAvailable to true. If the import fails (expected
 * during local dev when the SDK is not installed), it proceeds with
 * detection only and sdkAvailable stays false.
 */
export function MaybePlatformProvider({ children }: MaybePlatformProviderProps) {
  const [platformInfo, setPlatformInfo] = useState<PlatformDetectionResult>(
    () => detectPlatform(),
  )

  useEffect(() => {
    let cancelled = false

    const sdkModule = '@volley/' + 'platform-sdk'
    import(/* @vite-ignore */ sdkModule)
      .then(() => {
        if (!cancelled) {
          setPlatformInfo((prev) => ({ ...prev, sdkAvailable: true }))
        }
      })
      .catch(() => {
        // SDK not installed — expected in dev. No action needed.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PlatformContext value={platformInfo}>
      {children}
    </PlatformContext>
  )
}
