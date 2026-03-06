const PLATFORM_API_URLS: Record<string, string> = {
  local: 'platform-dev.volley-services.net',
  test: 'platform-dev.volley-services.net',
  dev: 'platform-dev.volley-services.net',
  staging: 'platform-staging.volley-services.net',
  production: 'platform.volley-services.net',
}

export function getPlatformApiUrl(stage?: string): string {
  if (!stage) return PLATFORM_API_URLS['production']!
  return PLATFORM_API_URLS[stage] ?? PLATFORM_API_URLS['production']!
}
