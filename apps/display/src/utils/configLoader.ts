export interface DisplayConfig {
  sessionId: string | null
  backendUrl: string
  stage: string
}

declare global {
  interface Window {
    electronAPI?: {
      getSessionId: () => Promise<string>
      getBackendUrl: () => Promise<string>
      getStage: () => Promise<string>
      platform: string
      isElectron: true
    }
  }
}

/**
 * Loads display configuration from Electron IPC (when running in Electron)
 * or falls back to Vite env vars / URL params (browser dev).
 */
export async function loadConfig(): Promise<DisplayConfig> {
  if (window.electronAPI?.isElectron) {
    return {
      sessionId: await window.electronAPI.getSessionId() || null,
      backendUrl: await window.electronAPI.getBackendUrl(),
      stage: await window.electronAPI.getStage(),
    }
  }

  return {
    sessionId: new URLSearchParams(window.location.search).get('sessionId'),
    backendUrl: (import.meta.env['VITE_SERVER_URL'] as string | undefined) ?? 'http://localhost:3000',
    stage: (import.meta.env['VITE_PLATFORM_SDK_STAGE'] as string | undefined) ?? 'local',
  }
}
