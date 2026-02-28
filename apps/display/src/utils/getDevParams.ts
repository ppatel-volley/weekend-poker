/**
 * Parses developer/testing URL parameters for the Display app.
 *
 * All values are optional — when absent the field is `undefined`
 * and callers fall back to their defaults.
 */

import type { InputMode, PlatformType } from '@weekend-casino/shared'

const VALID_INPUT_MODES: readonly string[] = ['touch', 'remote', 'voice']
const VALID_PLATFORMS: readonly string[] = [
  'FIRE_TV',
  'SAMSUNG_TIZEN',
  'LG_WEBOS',
  'BROWSER',
  'ELECTRON',
]

export interface DevParams {
  inputMode?: InputMode
  platform?: PlatformType
  sessionId?: string
  serverUrl?: string
}

export function getDevParams(): DevParams {
  const params = new URLSearchParams(window.location.search)

  const rawInputMode = params.get('inputMode')
  const rawPlatform = params.get('volley_platform')
  const sessionId = params.get('sessionId') ?? undefined
  const serverUrl = params.get('serverUrl') ?? undefined

  const inputMode =
    rawInputMode && VALID_INPUT_MODES.includes(rawInputMode)
      ? (rawInputMode as InputMode)
      : undefined

  const platform =
    rawPlatform && VALID_PLATFORMS.includes(rawPlatform)
      ? (rawPlatform as PlatformType)
      : undefined

  return { inputMode, platform, sessionId, serverUrl }
}
