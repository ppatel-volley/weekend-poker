/**
 * Parse allowed CORS origins from the ALLOWED_ORIGINS environment variable.
 * When set (comma-separated), returns those as string origins.
 * When not set, falls back to regex patterns for localhost + LAN development.
 */
export function parseAllowedOrigins(): (string | RegExp)[] {
  const envOrigins = process.env['ALLOWED_ORIGINS']
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(o => o.length > 0)
  }
  return [/^http:\/\/localhost:\d+$/, /^http:\/\/192\.168\.\d+\.\d+:\d+$/, /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/]
}
