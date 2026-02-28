/**
 * Platform types for TV platform integration.
 *
 * Supports Fire TV, Samsung Tizen, LG webOS, and browser/desktop.
 * Used by Display app for platform detection, input mode switching,
 * and production deployment configuration.
 */

/** Supported platform types for GameLift Streams deployment. */
export type PlatformType =
  | 'FIRE_TV'
  | 'SAMSUNG_TIZEN'
  | 'LG_WEBOS'
  | 'BROWSER'
  | 'ELECTRON'

/** Input mode for the Display — determines UI behaviour and navigation. */
export type InputMode =
  | 'touch'   // Phone/tablet controller (default for browser dev)
  | 'remote'  // D-pad/TV remote (Fire TV, Tizen, webOS)
  | 'voice'   // Voice-only input via Deepgram STT

/** Result of platform detection at Display startup. */
export interface PlatformDetectionResult {
  /** Detected platform. */
  platform: PlatformType
  /** Whether the platform is a TV (Fire TV, Tizen, webOS). */
  isTV: boolean
  /** Default input mode for the detected platform. */
  defaultInputMode: InputMode
  /** Whether the @volley/platform-sdk is available. */
  sdkAvailable: boolean
}

/** All TV platform types for convenience checks. */
export const TV_PLATFORMS: readonly PlatformType[] = [
  'FIRE_TV',
  'SAMSUNG_TIZEN',
  'LG_WEBOS',
] as const

/** Check whether a platform is a TV platform. */
export function isTVPlatform(platform: PlatformType): boolean {
  return TV_PLATFORMS.includes(platform)
}
