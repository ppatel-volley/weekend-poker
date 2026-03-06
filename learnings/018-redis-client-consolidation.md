# 018 — Redis Client Consolidation in Server Processes

**Severity:** High
**Category:** Infrastructure, Redis, Production
**Date:** 2026-03-05

## The Mistake

The Weekend Casino server process created three separate Redis clients:

1. **Resilient client** (`index.ts`) — main application client with custom retry and circuit-breaker logic
2. **Persistence singleton** (`redis-client.ts`) — separate client for profile/achievement persistence
   with different retry configuration (20 retries then throw)
3. **Scheduler client** (`scheduler/index.ts`) — yet another client for timer scheduling with its own
   connection parameters

Each had different retry strategies, different error handling, and different shutdown behaviour.

## Why This Is Wrong

### Inconsistent failure modes
When Redis goes down, one client queues commands indefinitely (resilient client), another throws after
20 retries (persistence), and the third has no explicit retry logic (scheduler). The server enters a
partially-degraded state that's difficult to reason about — some operations silently queue, others
throw errors, others hang.

### Connection leaks on shutdown
The scheduler client was never closed during graceful shutdown. The persistence client had its own
`disconnect()` method but it wasn't wired into the main shutdown sequence. On restart, stale
connections linger until Redis times them out.

### Resource waste
Three connections means 3x the TCP overhead, 3x the memory for command queues, and 3x the
authentication handshakes. In a containerised deployment with connection limits, this burns through
the pool unnecessarily.

## The Correct Process

Create ONE shared Redis client with a single, well-tested retry/resilience configuration. Pass it
to all consumers:

```typescript
// Create once at startup
const redisClient = createResilientRedisClient(config);

// Pass to all consumers
const persistence = new PersistenceService(redisClient);
const scheduler = new GameScheduler(redisClient);
const storage = new RedisSessionStorage(redisClient);

// Single shutdown path
process.on('SIGTERM', async () => {
  await redisClient.quit();
});
```

### Benefits
- **One retry strategy** — all operations fail or recover together
- **One shutdown path** — no leaked connections
- **One connection** — predictable resource usage
- **One place to monitor** — health checks inspect a single client

## Red Flags

- Multiple `createClient()` or `new Redis()` calls in the same server process
- Different retry configurations across Redis consumers
- Shutdown handlers that only close some Redis connections
- Health checks that test one Redis client while others are silently disconnected
- "Redis works for X but not for Y" bugs in production

## Prevention

- **Single client factory** — create Redis clients in exactly one place, export a shared instance
- **Dependency injection** — pass the client to consumers rather than letting them create their own
- **Shutdown audit** — `SIGTERM` handler must close every external connection; grep for `createClient`
  to find any that aren't wired in
- **Connection count monitoring** — alert if a single server process holds more Redis connections
  than expected
