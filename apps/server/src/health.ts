import { Router } from 'express'
import type Redis from 'ioredis'

/**
 * Check Redis connectivity with a 2-second timeout.
 */
async function checkRedis(redis: Redis): Promise<{ name: string; status: string }> {
  try {
    const pong = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ])
    return { name: 'redis', status: pong === 'PONG' ? 'healthy' : 'unhealthy' }
  } catch {
    return { name: 'redis', status: 'unhealthy' }
  }
}

/**
 * Create health check router with liveness and readiness probes.
 *
 * - GET /health — Liveness (always 200 if process running)
 * - GET /health/ready — Readiness (503 if Redis unhealthy)
 */
export function createHealthRouter(getRedis: () => Redis | null): Router {
  const router = Router()

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  })

  router.get('/health/ready', async (_req, res) => {
    const redis = getRedis()

    if (!redis) {
      // No Redis configured (dev mode) — report healthy with degraded redis
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          basic: { status: 'healthy' },
          redis: { name: 'redis', status: 'skipped' },
        },
      })
      return
    }

    const redisCheck = await checkRedis(redis)
    const checks = { basic: { status: 'healthy' }, redis: redisCheck }
    const allHealthy = Object.values(checks).every(c => c.status === 'healthy')

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    })
  })

  return router
}
