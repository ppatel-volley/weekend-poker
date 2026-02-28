import { createContext, useContext } from 'react'
import type { PlatformDetectionResult } from '@weekend-casino/shared'

/** Default context value used before detection runs. */
const DEFAULT_PLATFORM: PlatformDetectionResult = {
  platform: 'BROWSER',
  isTV: false,
  defaultInputMode: 'touch',
  sdkAvailable: false,
}

export const PlatformContext = createContext<PlatformDetectionResult>(DEFAULT_PLATFORM)

/**
 * Hook to access the detected platform info.
 * Must be used within a component wrapped by PlatformContext.Provider.
 */
export function usePlatform(): PlatformDetectionResult {
  return useContext(PlatformContext)
}
