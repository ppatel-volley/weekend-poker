import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { VGFServer, MemoryStorage, SocketIOTransport } from '@volley/vgf/server'
import type { PokerGameState } from '@weekend-poker/shared'
import { pokerRuleset } from './ruleset/index.js'
import { logger } from './logger.js'

const PORT = Number(process.env['PORT']) || 3000

const app = express()

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? ['https://your-production-domain.com']
  : [/^http:\/\/localhost:\d+$/, /^http:\/\/192\.168\.\d+\.\d+:\d+$/, /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/]

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}))

// ── Health endpoint ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// ── HTTP server ────────────────────────────────────────────────
const httpServer = createServer(app)

// ── VGF storage ───────────────────────────────────────────────
// TODO: Replace MemoryStorage with RedisPersistence for production deployments
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
const server = new VGFServer<PokerGameState>({
  game: pokerRuleset,
  httpServer,
  port: PORT,
  logger: logger as any,
  storage,
  transport,
  app,
  schedulerProvider: noopSchedulerProvider,
})

server.start()

logger.info({ port: PORT }, 'Weekend Poker server started')
