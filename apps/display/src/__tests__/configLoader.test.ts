import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadConfig } from '../utils/configLoader.js'

describe('loadConfig', () => {
  beforeEach(() => {
    // Reset electronAPI
    delete (window as unknown as Record<string, unknown>).electronAPI
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/' },
      writable: true,
    })
  })

  describe('Electron path', () => {
    it('loads config from Electron IPC', async () => {
      ;(window as unknown as Record<string, unknown>).electronAPI = {
        isElectron: true,
        platform: 'ELECTRON',
        getSessionId: vi.fn().mockResolvedValue('electron-session-123'),
        getBackendUrl: vi.fn().mockResolvedValue('http://backend:3000'),
        getStage: vi.fn().mockResolvedValue('staging'),
      }

      const config = await loadConfig()
      expect(config).toEqual({
        sessionId: 'electron-session-123',
        backendUrl: 'http://backend:3000',
        stage: 'staging',
      })
    })

    it('returns null sessionId when Electron returns empty string', async () => {
      ;(window as unknown as Record<string, unknown>).electronAPI = {
        isElectron: true,
        platform: 'ELECTRON',
        getSessionId: vi.fn().mockResolvedValue(''),
        getBackendUrl: vi.fn().mockResolvedValue('http://localhost:3000'),
        getStage: vi.fn().mockResolvedValue('local'),
      }

      const config = await loadConfig()
      expect(config.sessionId).toBeNull()
    })
  })

  describe('Browser path', () => {
    it('falls back to URL params and env vars', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?sessionId=url-session-456', pathname: '/' },
        writable: true,
      })

      const config = await loadConfig()
      expect(config.sessionId).toBe('url-session-456')
      expect(config.backendUrl).toBe('http://localhost:3000')
      expect(config.stage).toBe('local')
    })

    it('returns null sessionId when no URL param', async () => {
      const config = await loadConfig()
      expect(config.sessionId).toBeNull()
    })
  })
})
