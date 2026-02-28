/**
 * Video Playback State (D-011, D-013).
 *
 * Known Issue (V-MAJOR-3): Game design doc Section 21 vs 27 listed "background" as
 * a VideoPlayback.mode. This is WRONG. Background is a separate interface.
 * VideoPlayback.mode covers foreground playback only.
 */
export interface VideoPlayback {
  assetKey: string                            // video asset identifier
  mode: 'full_screen' | 'overlay' | 'transition'  // NO 'background' mode
  startedAt: number                           // server timestamp (ms)
  durationMs: number                          // expected duration
  blocking: boolean                           // halts game progression
  skippable: boolean                          // player can skip
  skipDelayMs: number                         // ms before skip is allowed
  priority: 'low' | 'medium' | 'high' | 'critical'
  complete: boolean                           // set by completeVideo or VIDEO_HARD_TIMEOUT thunk
}

/**
 * Background Video — Ambient loops, separate from foreground playback.
 * NOT a mode of VideoPlayback (D-011 correction).
 */
export interface BackgroundVideo {
  assetKey: string
  looping: boolean
  active: boolean
}

/**
 * Video asset counts per release (D-012).
 *
 * Canonical count for v1 is 51 assets:
 *   - 7 shared (lobby, game select, etc.)
 *   - 9 Hold'em
 *   - 10 5-Card Draw
 *   - 16 Blackjack Classic
 *   - 9 Blackjack Competitive
 */
export const VIDEO_ASSET_COUNTS = {
  // Shared
  shared: 7,

  // v1 games (total 51)
  holdem: 9,
  fiveCardDraw: 10,
  blackjackClassic: 16,
  blackjackCompetitive: 9,
  v1Total: 51,

  // v2.0 additions
  roulette: 11,
  threeCardPoker: 9,
  gameSelect: 1,
  v2_0Total: 72,

  // v2.1 additions
  craps: 12,
  v2_1Total: 84,
} as const

/**
 * Type guard to check if a value is a VideoPlayback object.
 */
export function isVideoPlayback(value: unknown): value is VideoPlayback {
  if (typeof value !== 'object' || value === null) return false
  const video = value as Record<string, unknown>
  return (
    typeof video.assetKey === 'string'
    && typeof video.mode === 'string'
    && ['full_screen', 'overlay', 'transition'].includes(video.mode as string)
    && typeof video.startedAt === 'number'
    && typeof video.durationMs === 'number'
    && typeof video.blocking === 'boolean'
    && typeof video.complete === 'boolean'
  )
}

/**
 * Create a new VideoPlayback object.
 */
export function createVideoPlayback(
  assetKey: string,
  mode: VideoPlayback['mode'] = 'overlay',
  options: Partial<Omit<VideoPlayback, 'assetKey' | 'mode'>> = {},
): VideoPlayback {
  return {
    assetKey,
    mode,
    startedAt: options.startedAt ?? Date.now(),
    durationMs: options.durationMs ?? 3000,
    blocking: options.blocking ?? false,
    skippable: options.skippable ?? true,
    skipDelayMs: options.skipDelayMs ?? 1000,
    priority: options.priority ?? 'medium',
    complete: options.complete ?? false,
  }
}
