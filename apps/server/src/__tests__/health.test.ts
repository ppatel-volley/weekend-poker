import { describe, it, expect, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createHealthRouter } from '../health.js'

function createApp(getRedis: () => any) {
  const app = express()
  app.use(createHealthRouter(getRedis))
  return app
}

describe('health endpoints', () => {
  describe('GET /health (liveness)', () => {
    it('returns 200 with status ok', async () => {
      const app = createApp(() => null)
      const res = await request(app).get('/health')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body).toHaveProperty('timestamp')
      expect(res.body).not.toHaveProperty('uptime')
      expect(res.body).not.toHaveProperty('version')
    })
  })

  describe('GET /health/ready (readiness)', () => {
    it('returns healthy with skipped redis when no Redis configured', async () => {
      const app = createApp(() => null)
      const res = await request(app).get('/health/ready')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('healthy')
      expect(res.body.checks.redis.status).toBe('skipped')
    })

    it('returns 200 when Redis PING succeeds', async () => {
      const mockRedis = { ping: vi.fn().mockResolvedValue('PONG') }
      const app = createApp(() => mockRedis)
      const res = await request(app).get('/health/ready')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('healthy')
      expect(res.body.checks.redis.status).toBe('healthy')
    })

    it('returns 503 when Redis PING fails', async () => {
      const mockRedis = { ping: vi.fn().mockRejectedValue(new Error('connection refused')) }
      const app = createApp(() => mockRedis)
      const res = await request(app).get('/health/ready')

      expect(res.status).toBe(503)
      expect(res.body.status).toBe('unhealthy')
      expect(res.body.checks.redis.status).toBe('unhealthy')
      // Error message is no longer exposed (security: info leak prevention)
    })

    it('returns 503 when Redis PING returns unexpected value', async () => {
      const mockRedis = { ping: vi.fn().mockResolvedValue('WRONG') }
      const app = createApp(() => mockRedis)
      const res = await request(app).get('/health/ready')

      expect(res.status).toBe(503)
      expect(res.body.status).toBe('unhealthy')
      expect(res.body.checks.redis.status).toBe('unhealthy')
    })
  })
})
