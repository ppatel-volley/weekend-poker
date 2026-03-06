import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { PlatformProvider } from '@volley/platform-sdk/react'
import {
  VGFProvider,
  createSocketIOClientTransport,
} from '@volley/vgf/client'
import { ClientType } from '@volley/vgf/types'
import { GameRouter } from './components/GameRouter.js'
import { WalletDisplay } from './components/shared/WalletDisplay.js'
import { PlayerInfo } from './components/shared/PlayerInfo.js'
import { VoiceButton } from './components/shared/VoiceButton.js'
import { ReactionBar } from './components/shared/ReactionBar.js'
import { ProfileView } from './components/ProfileView.js'
import { ChallengesView } from './components/ChallengesView.js'
import { CosmeticsView } from './components/CosmeticsView.js'
import { usePhase, useDispatchThunk } from './hooks/useVGFHooks.js'
import { usePlatformDeviceId } from './hooks/usePlatformDeviceId.js'

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

const GAME_ID =
  (import.meta.env['VITE_GAME_ID'] as string | undefined) ??
  'weekend-casino'

const STAGE = import.meta.env['VITE_PLATFORM_SDK_STAGE'] ?? 'local'

// Platform SDK resolves URLs internally for staging/production.
// Only local/dev/test stages need explicit overrides.
const PLATFORM_API_URLS: Record<string, string> = {
  local: 'https://platform-dev.volley-services.net',
  test: 'https://platform-dev.volley-services.net',
  dev: 'https://platform-dev.volley-services.net',
  staging: 'https://platform-staging.volley-services.net',
  production: 'https://platform.volley-services.net',
}

const PLATFORM_AUTH_URLS: Record<string, string | undefined> = {
  local: 'https://auth-dev.volley.tv',
  test: 'https://auth-dev.volley.tv',
  dev: 'https://auth-dev.volley.tv',
}

const platformApiUrl = PLATFORM_API_URLS[STAGE] ?? PLATFORM_API_URLS['production']
const platformAuthApiUrl = PLATFORM_AUTH_URLS[STAGE]

type ControllerTab = 'game' | 'profile' | 'challenges' | 'cosmetics'

// Ensure volley_hub_session_id exists in non-production stages — PlatformProvider requires it.
// Runs at module scope (once on import) to avoid side effects during render.
if (['local', 'test', 'dev', 'staging'].includes(STAGE)) {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('volley_hub_session_id')) {
    url.searchParams.set('volley_hub_session_id', crypto.randomUUID())
    window.history.replaceState({}, '', url.toString())
  }
}

export function App() {
  return (
    <PlatformProvider
      options={{
        gameId: GAME_ID,
        appVersion: __APP_VERSION__,
        stage: STAGE,
        platformApiUrl,
        platformAuthApiUrl,
        tracking: {
          segmentWriteKey: import.meta.env['VITE_SEGMENT_WRITE_KEY'],
        },
      }}
    >
      <AppInner />
    </PlatformProvider>
  )
}

function AppInner() {
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('sessionId')
  }, [])

  const userId = usePlatformDeviceId()

  if (!sessionId) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          background: '#1a1a2e',
          textAlign: 'center',
        }}
      >
        <h2 style={{ marginBottom: '16px' }}>No Session Found</h2>
        <p style={{ color: '#aaa', maxWidth: '280px', lineHeight: 1.5 }}>
          Please scan the QR code displayed on the TV to join a game.
        </p>
      </div>
    )
  }

  const transport = useMemo(
    () => createSocketIOClientTransport({
      url: SERVER_URL,
      query: {
        sessionId,
        userId,
        clientType: ClientType.Controller,
      },
      socketOptions: {
        transports: ['polling', 'websocket'],
      },
    }),
    [sessionId, userId],
  )

  return (
    <VGFProvider transport={transport}>
      <ConnectedController />
    </VGFProvider>
  )
}

/**
 * Inner controller UI — only renders PlayerInfo/WalletDisplay once
 * the VGF connection is established and the session member is registered.
 */
function ConnectedController() {
  const phase = usePhase()
  const [activeTab, setActiveTab] = useState<ControllerTab>('game')

  // Reset to game tab when returning to lobby (tab bar is hidden in lobby,
  // so player would be stuck on profile/challenges/cosmetics with no way back)
  const isGameplay = phase !== null && phase !== 'LOBBY' && phase !== 'GAME_SELECT'
  const prevIsGameplay = useRef(isGameplay)
  useEffect(() => {
    if (prevIsGameplay.current && !isGameplay && activeTab !== 'game') {
      setActiveTab('game')
    }
    prevIsGameplay.current = isGameplay
  }, [isGameplay, activeTab])

  // Dispatch joinSession thunk once VGF state sync completes (phase becomes non-null)
  const dispatchThunk = useDispatchThunk() as (name: string, ...args: unknown[]) => void
  const hasJoined = useRef(false)
  useEffect(() => {
    if (phase && !hasJoined.current) {
      hasJoined.current = true
      dispatchThunk('joinSession', {})
    }
  }, [phase, dispatchThunk])

  // Dispatch leaveSession on page unload only (NOT on visibilitychange).
  // Backgrounding the tab should NOT remove the player — they may switch apps
  // briefly and return. Only true page close/navigation triggers cleanup.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasJoined.current) {
        dispatchThunk('leaveSession')
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [dispatchThunk])

  if (!phase) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#1a1a2e',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p>Connecting to game...</p>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileView />
      case 'challenges':
        return <ChallengesView />
      case 'cosmetics':
        return <CosmeticsView />
      case 'game':
      default:
        return (
          <>
            {/* Game-specific content */}
            <div style={{ flex: 1 }}>
              <GameRouter />
            </div>

            {/* Reaction bar — only visible during gameplay, not in lobby */}
            {isGameplay && <ReactionBar />}

            {/* Voice button footer */}
            <div style={{ padding: '12px 16px 16px' }}>
              <VoiceButton />
            </div>
          </>
        )
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#1a1a2e',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Top bar: player info + wallet */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <PlayerInfo />
        <WalletDisplay />
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderTabContent()}
      </div>

      {/* Bottom tab navigation — visible during gameplay */}
      {isGameplay && (
        <div style={tabBarStyle}>
          <TabButton
            label="Game"
            active={activeTab === 'game'}
            onClick={() => setActiveTab('game')}
          />
          <TabButton
            label="Profile"
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          />
          <TabButton
            label="Challenges"
            active={activeTab === 'challenges'}
            onClick={() => setActiveTab('challenges')}
          />
          <TabButton
            label="Cosmetics"
            active={activeTab === 'cosmetics'}
            onClick={() => setActiveTab('cosmetics')}
          />
        </div>
      )}
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 0',
        background: 'none',
        border: 'none',
        color: active ? '#d4af37' : '#666',
        fontWeight: active ? 'bold' : 'normal',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        cursor: 'pointer',
        borderTop: active ? '2px solid #d4af37' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  )
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  background: '#16162a',
}
