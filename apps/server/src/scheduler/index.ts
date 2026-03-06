import type { RedisRuntimeSchedulerStore as SchedulerStore } from '@volley/vgf/server'
import type Redis from 'ioredis'
import { InMemoryRuntimeSchedulerStore } from './in-memory-scheduler-store.js'

type IRuntimeSchedulerStore = Pick<SchedulerStore, 'load' | 'save' | 'remove'>

/**
 * Create the appropriate scheduler store based on environment.
 *
 * - When a redisClient is provided: uses RedisRuntimeSchedulerStore (production)
 * - Otherwise: uses InMemoryRuntimeSchedulerStore (development)
 */
export async function createSchedulerStore(redisClient?: Redis | null): Promise<IRuntimeSchedulerStore> {
  if (redisClient) {
    const { RedisRuntimeSchedulerStore } = await import('@volley/vgf/server')
    const { logger } = await import('../logger.js')

    return new RedisRuntimeSchedulerStore({
      redisClient,
      logger,
    })
  }

  return new InMemoryRuntimeSchedulerStore()
}

export { InMemoryRuntimeSchedulerStore } from './in-memory-scheduler-store.js'
