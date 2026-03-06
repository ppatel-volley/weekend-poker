import Redis from 'ioredis'
import { logger } from '../logger.js'

/**
 * Retry strategy with exponential backoff and jitter.
 * Exported for unit testing without needing a Redis connection.
 *
 * Formula: min(2^times * 25, 5000) + random(0, 500)
 * Produces: ~50ms, ~100ms, ~200ms, ..., capped at ~5.5s
 */
export function retryStrategy(times: number): number {
  return Math.min(Math.pow(2, times) * 25, 5000) + Math.random() * 500
}

/**
 * Create a resilient Redis client with exponential backoff, jitter,
 * unlimited retries, and offline command queuing.
 *
 * Per BUILDING_TV_GAMES section 17.4.
 */
export function createResilientRedisClient(url: string): Redis {
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    retryStrategy,
  })

  client.on('connect', () => logger.info('Redis connected'))
  client.on('ready', () => logger.info('Redis ready'))
  client.on('error', (err) => logger.error({ err }, 'Redis error'))
  client.on('close', () => logger.warn('Redis connection closed'))

  return client
}
