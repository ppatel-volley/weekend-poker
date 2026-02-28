import type { PlatformType, PlatformDetectionResult, InputMode } from '@weekend-casino/shared'
import { isTVPlatform } from '@weekend-casino/shared'

/**
 * Detect the current platform from URL params, user agent, or fallback.
 *
 * Priority:
 *   1. URL param `?volley_platform=FIRE_TV` (explicit override)
 *   2. User agent string matching
 *   3. Fallback to BROWSER
 */
export function detectPlatform(): PlatformDetectionResult {
  const platform = detectPlatformType()
  const isTV = isTVPlatform(platform)
  const defaultInputMode = getDefaultInputMode(platform)

  return {
    platform,
    isTV,
    defaultInputMode,
    sdkAvailable: false, // Updated later by MaybePlatformProvider
  }
}

/** Valid platform type strings for URL param validation. */
const VALID_PLATFORMS: readonly PlatformType[] = [
  'FIRE_TV',
  'SAMSUNG_TIZEN',
  'LG_WEBOS',
  'BROWSER',
  'ELECTRON',
] as const

function detectPlatformType(): PlatformType {
  // 1. Check URL param override
  const urlPlatform = getUrlPlatformParam()
  if (urlPlatform) return urlPlatform

  // 2. Check user agent
  const uaPlatform = detectFromUserAgent()
  if (uaPlatform) return uaPlatform

  // 3. Fallback
  return 'BROWSER'
}

function getUrlPlatformParam(): PlatformType | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const value = params.get('volley_platform')
    if (value && (VALID_PLATFORMS as readonly string[]).includes(value)) {
      return value as PlatformType
    }
  } catch {
    // SSR or no window — ignore
  }
  return null
}

function detectFromUserAgent(): PlatformType | null {
  try {
    const ua = navigator.userAgent
    if (ua.includes('AFT') || ua.includes('Amazon')) return 'FIRE_TV'
    if (ua.includes('Tizen')) return 'SAMSUNG_TIZEN'
    if (ua.includes('Web0S') || ua.includes('webOS')) return 'LG_WEBOS'
  } catch {
    // SSR or no navigator — ignore
  }
  return null
}

function getDefaultInputMode(platform: PlatformType): InputMode {
  switch (platform) {
    case 'FIRE_TV':
    case 'SAMSUNG_TIZEN':
    case 'LG_WEBOS':
      return 'remote'
    case 'ELECTRON':
    case 'BROWSER':
    default:
      return 'touch'
  }
}
