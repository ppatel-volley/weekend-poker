import { createLogger } from '@volley/logger'

/**
 * Application logger — uses @volley/logger (pino wrapper) for structured JSON logging.
 * Configure LOG_LEVEL via environment variable (default: 'info').
 *
 * ILogger interface is directly compatible with VGF's ILogger (trace, debug, info, warn, error, fatal).
 */
export const logger = createLogger({
  type: 'node',
  level: process.env['LOG_LEVEL'] ?? 'info',
  formatters: {
    level(label: string) {
      return { level: label }
    },
  },
})
