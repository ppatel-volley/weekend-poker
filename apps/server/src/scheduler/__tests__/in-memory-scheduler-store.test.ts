import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryRuntimeSchedulerStore } from '../in-memory-scheduler-store.js'

describe('InMemoryRuntimeSchedulerStore', () => {
  let store: InMemoryRuntimeSchedulerStore

  beforeEach(() => {
    store = new InMemoryRuntimeSchedulerStore()
  })

  const mockState = {
    lastPersistedAt: Date.now(),
    entries: {
      timer1: {
        type: 'timeout' as const,
        name: 'timer1',
        dispatch: { kind: 'thunk' as const, name: 'onTimeout' },
        mode: 'hold' as const,
        paused: false,
        dueAt: Date.now() + 5000,
        nextAt: Date.now() + 5000,
      },
    },
  }

  it('load returns null for unknown session', async () => {
    const result = await store.load('nonexistent')
    expect(result).toBeNull()
  })

  it('save then load returns stored state', async () => {
    await store.save('session-1', mockState)
    const result = await store.load('session-1')
    expect(result).toEqual(mockState)
  })

  it('save overwrites previous state', async () => {
    await store.save('session-1', mockState)

    const updated = { lastPersistedAt: Date.now(), entries: {} }
    await store.save('session-1', updated)

    const result = await store.load('session-1')
    expect(result).toEqual(updated)
  })

  it('remove deletes stored state', async () => {
    await store.save('session-1', mockState)
    await store.remove('session-1')

    const result = await store.load('session-1')
    expect(result).toBeNull()
  })

  it('remove is idempotent for unknown session', async () => {
    await expect(store.remove('nonexistent')).resolves.toBeUndefined()
  })

  it('isolates sessions from each other', async () => {
    const state2 = { lastPersistedAt: Date.now(), entries: {} }

    await store.save('session-1', mockState)
    await store.save('session-2', state2)

    expect(await store.load('session-1')).toEqual(mockState)
    expect(await store.load('session-2')).toEqual(state2)

    await store.remove('session-1')
    expect(await store.load('session-1')).toBeNull()
    expect(await store.load('session-2')).toEqual(state2)
  })
})
