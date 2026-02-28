/**
 * Returns a stable userId for this Display session.
 *
 * Priority:
 * 1. `?userId` URL param (useful for dev/testing)
 * 2. Auto-generated `display-<uuid>` (cached for the session lifetime)
 */

let cached: string | undefined

export function getDisplayUserId(): string {
  if (cached) return cached

  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('userId')

  cached = fromUrl ?? `display-${crypto.randomUUID()}`
  return cached
}
