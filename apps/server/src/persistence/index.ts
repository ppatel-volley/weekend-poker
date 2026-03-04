/**
 * Persistence layer barrel export.
 *
 * Re-exports all persistence modules for convenient importing.
 */

export { getRedisClient, closeRedisClient, resetRedisClient } from './redis-client.js'
export { resolveIdentity } from './identity-resolver.js'
export type { ResolvedIdentity } from './identity-resolver.js'
export * as playerStore from './player-store.js'
export * as dailyBonusStore from './daily-bonus-store.js'
export * as challengeStore from './challenge-store.js'
export * as achievementStore from './achievement-store.js'
export * as cosmeticStore from './cosmetic-store.js'
export { createRetentionRouter } from './routes.js'
