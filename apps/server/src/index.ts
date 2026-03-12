import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import { WGFServer, MemoryStorage, RedisPersistence, getSocketQueryParams } from '@volley/vgf/server'
import { ClientType } from '@volley/vgf/types'
import { createLoggerHttpMiddleware } from '@volley/logger'
import { v4 as uuidv4 } from 'uuid'
import type { CasinoGameState } from '@weekend-casino/shared'
import { pokerRuleset } from './ruleset/index.js'
import { logger } from './logger.js'
import { parseAllowedOrigins } from './cors-config.js'
import { getRedisClient, closeRedisClient } from './persistence/redis-client.js'
import { createRetentionRouter } from './persistence/routes.js'
import { createSchedulerStore } from './scheduler/index.js'
import { registerSocket, unregisterConnection } from './ruleset/connection-registry.js'
import { clearSessionTracker } from './persistence/challenge-utils.js'
import { createResilientRedisClient } from './services/redis-client.js'
import { createHealthRouter } from './health.js'
import type Redis from 'ioredis'

const PORT = Number(process.env['PORT']) || 3000

const app = express()

const ALLOWED_ORIGINS = parseAllowedOrigins()

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}))

app.use(express.json())

// ── HTTP request logging ─────────────────────────────────────────
app.use(createLoggerHttpMiddleware({ logger, genReqId: () => uuidv4() }))

// ── Resilient Redis client (production) ──────────────────────────
let resilientRedis: Redis | null = null
const redisUrl = process.env['REDIS_URL']
if (redisUrl) {
  resilientRedis = createResilientRedisClient(redisUrl)
}

// ── Health endpoints ─────────────────────────────────────────────
app.use(createHealthRouter(() => resilientRedis))

// ── Session validation middleware (logging) ──────────────────────
app.post('/api/session', (req, _res, next) => {
  logger.info({
    ip: req.ip ?? req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  }, 'Session creation request')
  next()
})

// ── v2.2 Retention REST routes ─────────────────────────────────
app.use(createRetentionRouter())

// ── HTTP server ────────────────────────────────────────────────
const httpServer = createServer(app)

// ── Storage ───────────────────────────────────────────────────
// MemoryStorage with optional RedisPersistence for durability.
// When REDIS_URL is set, sessions survive server restarts.
const persistence = resilientRedis
  ? new RedisPersistence({ redisClient: resilientRedis, logger: logger as any })
  : undefined
const storage = new MemoryStorage({ ttlInSeconds: 14400, persistence })

// ── Socket.IO server ──────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
})

// ── Scheduler store ───────────────────────────────────────────
// Uses RedisRuntimeSchedulerStore when REDIS_URL is set (production/Memurai),
// falls back to InMemoryRuntimeSchedulerStore (dev without Redis).
const schedulerStore = await createSchedulerStore(resilientRedis)

// ── WGF server ────────────────────────────────────────────────
const server = new WGFServer<CasinoGameState>({
  gameRuleset: pokerRuleset,
  httpServer,
  port: PORT,
  logger: logger as any,
  storage,
  expressApp: app,
  socketIOServer: io,
  schedulerStore,
})

// ── Connection registration + disconnect cleanup ─────────────
// WGFServer does NOT call onConnect/onDisconnect lifecycle hooks (Learning 015).
// Connection registration for hole card delivery is handled here via Socket.IO.
//
// Disconnect cleanup:
// 1. Clean disconnect (beforeunload): client dispatches leaveSession thunk
// 2. Abrupt disconnect (crash/network): Socket.IO disconnect fires here,
//    and we clean up game state via storage API with a 30s grace period.
//    WGFServer's WebSocketServer also marks the session member as DISCONNECTED.
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()

io.on('connection', (socket) => {
  try {
    const params = getSocketQueryParams(socket)
    const { sessionId, userId, clientType } = params

    if (clientType === ClientType.Controller) {
      // SECURITY: Validate userId is an actual VGF session member before registering.
      // Prevents connection registry hijack (F2+F8).
      // VGF's WebSocketServer registers the member concurrently with this callback,
      // so we allow a brief retry window (3 attempts, 200ms apart) for the race.
      // Post-validation setup: register socket, cancel disconnect timers, bind disconnect handler.
      // Only runs after membership is confirmed — prevents hijack and cleanup of unvalidated sockets.
      const onValidated = () => {
        registerSocket(sessionId, userId, socket)

        // Cancel any pending disconnect cleanup (reconnection scenario)
        const timerKey = `${sessionId}:${userId}`
        const pending = disconnectTimers.get(timerKey)
        if (pending) {
          clearTimeout(pending)
          disconnectTimers.delete(timerKey)
          logger.info({ sessionId, userId }, 'Reconnection detected — cancelled disconnect cleanup')
        }

        socket.on('disconnect', () => {
          unregisterConnection(sessionId, userId)
          logger.info({ sessionId, userId }, 'Controller disconnected — connection unregistered')

        // Capture phase at disconnect time for safety check below.
        const currentSession = storage.getSessionById(sessionId)
        const phaseAtDisconnect = (currentSession?.state as CasinoGameState)?.phase

        // Schedule game state cleanup after grace period.
        // If the client reconnects within 30s (joinSession thunk will re-add),
        // the timer is cancelled above.
        //
        // NOTE (VGF RFC — Predictable Game State Processing):
        // This code directly mutates storage outside the VGF dispatch pipeline.
        // A phase safety check below mitigates the risk: if the phase changed
        // since disconnect, a transition already ran and direct mutation would
        // risk corruption (RFC Lifecycle Protection). We skip cleanup in that case.
        const timer = setTimeout(() => {
          disconnectTimers.delete(timerKey)
          try {
            const session = storage.getSessionById(sessionId)
            if (!session) return

            const state = session.state as CasinoGameState

            // Safety: if phase changed since disconnect, a transition already ran.
            // Direct storage mutation during/after a transition risks corruption (RFC Lifecycle Protection).
            if (state.phase !== phaseAtDisconnect) {
              logger.info({ sessionId, userId, phaseAtDisconnect, currentPhase: state.phase },
                'Phase changed during grace period — skipping direct cleanup')
              return
            }

            const player = state.players.find(p => p.id === userId)
            if (!player) return

            if (state.phase === 'LOBBY' || state.phase === 'GAME_SELECT') {
              // Lobby: remove the player entirely.
              // Must replicate casinoRemovePlayer reducer side-effects:
              // 1. Filter from players array
              // 2. Remove wallet entry (prevents stale wallet state)
              // 3. Clear session tracker (prevents cross-session leakage)
              const walletWithoutPlayer = Object.fromEntries(
                Object.entries(state.wallet).filter(([id]) => id !== userId),
              )
              if (player.persistentId) {
                try {
                  clearSessionTracker(sessionId, player.persistentId)
                } catch { /* best-effort */ }
              }
              const updated = {
                ...state,
                players: state.players.filter(p => p.id !== userId),
                wallet: walletWithoutPlayer,
              }
              storage.updateSessionState(sessionId, updated)
              logger.info({ sessionId, userId }, 'Orphaned lobby player removed after disconnect grace period')
            } else {
              // Mid-game: mark disconnected (don't remove — they might reconnect later)
              const updated = {
                ...state,
                players: state.players.map(p =>
                  p.id === userId ? { ...p, isConnected: false } : p,
                ),
              }
              storage.updateSessionState(sessionId, updated)
              logger.info({ sessionId, userId }, 'Player marked disconnected after grace period')
            }

            // Broadcast updated state to remaining clients (VGF format: uppercase type + full session)
            const updatedSession = storage.getSessionById(sessionId)
            if (updatedSession) {
              server.webSocketServer.broadcastToSession({
                sessionId,
                message: { type: 'STATE_UPDATE', session: updatedSession },
              })
            }
          } catch (err) {
            logger.warn({ err, sessionId, userId }, 'Disconnect cleanup failed')
          }
        }, 30_000) // 30s grace period

        disconnectTimers.set(timerKey, timer)
      })
      }

      const sessionMember = storage.getSessionMemberById(sessionId, userId)
      if (sessionMember) {
        // Member already registered — safe to connect immediately.
        onValidated()
      } else {
        // Deferred validation: VGF may not have registered the member yet.
        // Retry up to 3 times with 200ms delay before rejecting.
        // Socket is NOT registered until validation succeeds (prevents hijack).
        let validated = false
        const retryValidation = async () => {
          for (let attempt = 0; attempt < 3; attempt++) {
            await new Promise(r => setTimeout(r, 200))
            if (storage.getSessionMemberById(sessionId, userId)) {
              validated = true
              return
            }
          }
        }
        retryValidation().then(() => {
          if (validated && socket.connected) {
            onValidated()
          } else if (!socket.connected) {
            logger.info({ sessionId, userId }, 'Socket disconnected before validation completed — skipping registration')
          } else {
            logger.warn({ sessionId, userId }, 'Rejected connection — not a session member after retries, disconnecting socket')
            socket.disconnect(true)
          }
        })
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Socket.IO connection query param parsing failed')
  }
})

// ── Initialise persistence Redis ─────────────────────────────────
getRedisClient()
  .then(() => logger.info('Redis client initialised (persistence ready)'))
  .catch(err => logger.warn({ err }, 'Redis init failed — persistence degraded (dev mode)'))

server.start()

// ── Error handlers (registered AFTER server.start()) ──────────────
// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler with structured logging
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const reqLogger = (req as any).logger ?? logger
  reqLogger.error({ err, method: req.method, url: req.url }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

logger.info({ port: PORT }, 'Weekend Casino server started (WGFServer)')

// ── Graceful shutdown ─────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 25_000

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received, draining connections...')

  const forceTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceTimer.unref()

  // 1. Clear disconnect cleanup timers (prevent firing into dead process)
  for (const timer of disconnectTimers.values()) clearTimeout(timer)
  disconnectTimers.clear()

  // 2. Stop accepting new connections
  httpServer.close()

  // 3. Stop WGFServer (drain Socket.IO connections)
  try {
    server.stop()
    logger.info('WGFServer stopped')
  } catch (err) {
    logger.warn({ err }, 'Error stopping WGFServer')
  }

  // 4. Close Redis
  try {
    if (resilientRedis) await resilientRedis.quit()
    await closeRedisClient()
  } catch (err) {
    logger.warn({ err }, 'Error closing Redis clients')
  }

  clearTimeout(forceTimer)
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
