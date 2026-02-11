import pino from 'pino'

/**
 * Application logger — uses pino for structured JSON logging.
 * Configure LOG_LEVEL via environment variable (default: 'info').
 *
 * Pino's interface is compatible with VGF's ILogger (trace, debug, info, warn, error, fatal).
 */
export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
})
