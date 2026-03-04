/**
 * Identity resolver — maps connection metadata to a persistent identity.
 *
 * Priority chain (strongest to weakest):
 *   1. accountId — Platform SDK authenticated user (useAccount())
 *   2. anonymousId — Platform SDK device identity (useAnonymousId())
 *   3. deviceToken — Dev-mode localStorage UUID
 *
 * In production, the Hub passes identity via URL query params which flow
 * through Socket.IO connection metadata. In dev, the controller generates
 * a UUID in localStorage and sends it as deviceToken.
 */

import type { IdentitySource } from '@weekend-casino/shared'

export interface ResolvedIdentity {
  /** The persistent token used as Redis key. */
  token: string
  /** How the identity was resolved. */
  source: IdentitySource
}

/**
 * Resolve the strongest available identity from connection metadata.
 *
 * @param metadata - Socket.IO connection query params (or VGF connection metadata)
 * @returns Resolved identity with token and source
 */
export function resolveIdentity(
  metadata: Record<string, unknown>,
): ResolvedIdentity {
  // Priority 1: Platform SDK authenticated account
  const accountId = metadata['accountId'] ?? metadata['volley_account']
  if (typeof accountId === 'string' && accountId.length > 0) {
    return { token: accountId, source: 'platform_account' }
  }

  // Priority 2: Platform SDK anonymous device identity
  const anonymousId = metadata['anonymousId']
  if (typeof anonymousId === 'string' && anonymousId.length > 0) {
    return { token: anonymousId, source: 'platform_anonymous' }
  }

  // Priority 3: Dev-mode device token (localStorage UUID)
  const deviceToken = metadata['deviceToken'] ?? metadata['userId']
  if (typeof deviceToken === 'string' && deviceToken.length > 0) {
    return { token: deviceToken, source: 'device_token' }
  }

  // Fallback: generate a transient token (shouldn't happen in practice)
  return { token: `anon_${Date.now()}`, source: 'device_token' }
}
