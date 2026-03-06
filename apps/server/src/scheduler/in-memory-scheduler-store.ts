import type { RedisRuntimeSchedulerStore } from '@volley/vgf/server'

/**
 * Extract the IRuntimeSchedulerStore interface from RedisRuntimeSchedulerStore,
 * since VGF 4.8.0 does not export the interface or RuntimeSchedulerState directly.
 */
type RuntimeSchedulerState = Awaited<ReturnType<RedisRuntimeSchedulerStore['load']>> & object

type IRuntimeSchedulerStore = Pick<RedisRuntimeSchedulerStore, 'load' | 'save' | 'remove'>

/**
 * In-memory implementation of IRuntimeSchedulerStore for development.
 * Production uses RedisRuntimeSchedulerStore from @volley/vgf/server.
 */
export class InMemoryRuntimeSchedulerStore implements IRuntimeSchedulerStore {
  private readonly store = new Map<string, RuntimeSchedulerState>()

  async load(sessionId: string): Promise<RuntimeSchedulerState | null> {
    return this.store.get(sessionId) ?? null
  }

  async save(sessionId: string, runtime: RuntimeSchedulerState): Promise<void> {
    this.store.set(sessionId, runtime)
  }

  async remove(sessionId: string): Promise<void> {
    this.store.delete(sessionId)
  }
}
