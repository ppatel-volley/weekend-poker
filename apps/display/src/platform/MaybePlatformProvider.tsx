import { useState, useEffect, type ReactNode } from 'react'
import type { PlatformDetectionResult } from '@weekend-casino/shared'
import { PlatformContext } from './PlatformContext.js'
import { detectPlatform } from './detectPlatform.js'
import { ensureLocalHubSessionId } from '../utils/ensureLocalHubSessionId.js'

interface MaybePlatformProviderProps {
  children: ReactNode
}

const stage =
  (import.meta.env['VITE_PLATFORM_SDK_STAGE'] as string | undefined) ?? 'local'

/**
 * Wraps children with PlatformContext, detecting the platform on mount.
 *
 * Attempts a dynamic import of `@volley/platform-sdk` to check availability.
 * If the SDK is importable, sets `sdkAvailable: true` in context so downstream
 * components can conditionally use Platform SDK hooks.
 * If the import fails (expected during local dev without the SDK), proceeds
 * with platform detection only and sdkAvailable stays false.
 *
 * NOTE: This does NOT mount a PlatformProvider. The display app on GameLift
 * Streams uses platform detection for input mode switching, not for auth/tracking.
 * The controller app wraps in PlatformProvider directly (see controller App.tsx).
 *
 * For non-production stages, injects a fake `volley_hub_session_id` URL param
 * to prevent PlatformProvider from crashing without the TV shell.
 */
export function MaybePlatformProvider({ children }: MaybePlatformProviderProps) {
  const [platformInfo, setPlatformInfo] = useState<PlatformDetectionResult>(
    () => detectPlatform(),
  )

  useEffect(() => {
    let cancelled = false

    // Inject fake hub session ID for non-production stages
    ensureLocalHubSessionId(stage)

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
