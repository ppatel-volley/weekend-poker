/**
 * Injects a fake `volley_hub_session_id` URL param for non-production stages.
 *
 * PlatformProvider requires this param to be present. On real TV hardware the
 * platform shell provides it, but in local/dev/staging we must inject one to
 * prevent the provider from crashing.
 *
 * Pattern from all production Volley apps (Jeopardy, Hub, Song Quiz, WoF).
 */
export function ensureLocalHubSessionId(stage: string): void {
  if (['local', 'test', 'dev', 'staging'].includes(stage)) {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('volley_hub_session_id')) {
      params.set('volley_hub_session_id', `local-dev-${Date.now()}`)
      window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
    }
  }
}
