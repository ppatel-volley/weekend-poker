import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { VGFServer, MemoryStorage, SocketIOTransport } from '@volley/vgf/server'
import type { CasinoGameState } from '@weekend-casino/shared'
import { pokerRuleset } from './ruleset/index.js'
import { logger } from './logger.js'
import { parseAllowedOrigins } from './cors-config.js'
import { getRedisClient } from './persistence/redis-client.js'
import { createRetentionRouter } from './persistence/routes.js'

const PORT = Number(process.env['PORT']) || 3000

const app = express()

const ALLOWED_ORIGINS = parseAllowedOrigins()

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}))

app.use(express.json())

// ── Health endpoint ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// ── v2.2 Retention REST routes ─────────────────────────────────
app.use(createRetentionRouter())

// ── HTTP server ────────────────────────────────────────────────
const httpServer = createServer(app)

// ── VGF storage ───────────────────────────────────────────────
// TODO: When REDIS_URL is set, wire in RedisStorage from VGF's Redis adapter
// e.g. const storage = process.env['REDIS_URL']
//        ? new RedisStorage({ url: process.env['REDIS_URL'] })
//        : new MemoryStorage({ ttlInSeconds: 14400 })
const storage = new MemoryStorage({ ttlInSeconds: 14400 })

// ── VGF transport ──────────────────────────────────────────────
const transport = new SocketIOTransport({
  httpServer,
  storage,
  logger: logger as any, // pino is interface-compatible with VGF's ILogger
  socketOptions: {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
  },
})

// ── In-memory scheduler (dev) ─────────────────────────────────
// No-op scheduler satisfies VGF's scheduler.recover() calls during
// connection setup. Replace with RedisRuntimeSchedulerStore in production.
const noopSchedulerProvider = () => ({
  async upsertTimeout() {},
  async upsertInterval() {},
  async cancel() {},
  async pause() {},
  async resume() {},
  async pauseAll() {},
  async resumeAll() {},
  async exists() { return false },
  async get() { return null },
  async recover() {},
})

// ── VGF server ─────────────────────────────────────────────────
// TODO: Add RedisRuntimeSchedulerStore for scheduled actions in production
const server = new VGFServer<CasinoGameState>({
  game: pokerRuleset,
  httpServer,
  port: PORT,
  logger: logger as any,
  storage,
  transport,
  app,
  schedulerProvider: noopSchedulerProvider,
})

// ── v2.2: Initialise Redis for persistence ───────────────────────
getRedisClient()
  .then(() => logger.info('Redis client initialised (persistence ready)'))
  .catch(err => logger.warn({ err }, 'Redis init failed — persistence degraded (dev mode)'))

server.start()

logger.info({ port: PORT }, 'Weekend Casino server started')
