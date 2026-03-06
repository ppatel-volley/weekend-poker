/**
 * Redis client factory — singleton pattern.
 *
 * Uses ioredis if REDIS_URL is set (production), else ioredis-mock (dev).
 * Same module-level singleton approach as server-game-state.ts.
 *
 * TODO: Consolidate with the shared resilientRedis client from index.ts.
 * This singleton has a different lifecycle (lazy init, no retry strategy)
 * which makes it safe to keep separate for now, but ideally there should
 * be a single Redis client for the entire process.
 */

import type Redis from 'ioredis'

let redisInstance: Redis | null = null

/**
 * Get or create the Redis client singleton.
 * In dev: uses ioredis-mock (in-memory, no external Redis needed).
 * In production: connects to REDIS_URL.
 */
export async function getRedisClient(): Promise<Redis> {
  if (redisInstance) return redisInstance

  const redisUrl = process.env['REDIS_URL']

  if (redisUrl) {
    // Production: real ioredis
    const { default: IORedis } = await import('ioredis')
    redisInstance = new IORedis(redisUrl)
  } else {
    // Dev: ioredis-mock (dynamic import to keep it dev-only)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: IORedisMock } = await import('ioredis-mock' as string) as { default: new () => Redis }
    redisInstance = new IORedisMock()
  }

  return redisInstance
}

/**
 * Close the Redis connection (for graceful shutdown / tests).
 */
export async function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit()
    redisInstance = null
  }
}

/**
 * Reset the Redis client (for tests — clears singleton).
 */
export function resetRedisClient(): void {
  redisInstance = null
}
