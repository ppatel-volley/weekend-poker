import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import {
  VGFProvider,
  createSocketIOClientTransport,
  createSession,
} from '@volley/vgf/client'
import { ClientType } from '@volley/vgf/types'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace } from 'three'
import { SceneRouter } from './components/scenes/index.js'
import { LobbyScene } from './components/scenes/LobbyScene.js'
import { CasinoHUD } from './components/hud/CasinoHUD.js'
import { LobbyView } from './components/LobbyView.js'
import { ReactionOverlay } from './components/ReactionOverlay.js'
import { BlackjackVideoOverlay } from './components/VideoOverlay.js'
import { SessionIdContext } from './hooks/useSessionId.js'
import { usePhase } from './hooks/useVGFHooks.js'
import { MaybePlatformProvider, InputModeProvider } from './platform/index.js'
import { getDisplayUserId } from './utils/getDisplayUserId.js'
import { getDevParams } from './utils/getDevParams.js'

const GameNightLeaderboardScene = React.lazy(() =>
  import('./components/scenes/GameNightLeaderboardScene.js').then(m => ({ default: m.GameNightLeaderboardScene })),
)
const GameNightChampionScene = React.lazy(() =>
  import('./components/scenes/GameNightChampionScene.js').then(m => ({ default: m.GameNightChampionScene })),
)

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

/** Shared Canvas GL configuration — reused for lobby and game scenes. */
const CANVAS_GL_CONFIG = {
  antialias: true,
  toneMapping: ACESFilmicToneMapping,
  outputColorSpace: SRGBColorSpace,
  powerPreference: 'high-performance' as const,
}

/**
 * Decides whether to show the 3D lobby (with 2D overlay) or the game canvas.
 *
 * In lobby mode, the R3F Canvas renders the atmospheric LobbyScene as a
 * 3D background, with the 2D LobbyView (QR code, player list, etc.)
 * absolutely positioned on top with a semi-transparent background so
 * the 3D scene shows through.
 */
function DisplayRouter() {
  const phase = usePhase()

  // Game Night overlay phases — full-screen 2D HTML (no Canvas)
  if (phase === 'GN_LEADERBOARD') {
    return (
      <Suspense fallback={null}>
        <GameNightLeaderboardScene />
        <ReactionOverlay />
      </Suspense>
    )
  }
  if (phase === 'GN_CHAMPION') {
    return (
      <Suspense fallback={null}>
        <GameNightChampionScene />
        <ReactionOverlay />
      </Suspense>
    )
  }

  const isLobby = !phase || phase === 'LOBBY' || phase === 'GAME_SELECT'

  if (isLobby) {
    return (
      <>
        <Canvas
          shadows={{ type: PCFShadowMap }}
          gl={CANVAS_GL_CONFIG}
          dpr={1}
          camera={{ fov: 45, near: 0.1, far: 100, position: [0, 8, 10] }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Suspense fallback={null}>
            <LobbyScene />
          </Suspense>
        </Canvas>
        {/* 2D overlay on top of the 3D lobby scene */}
        <LobbyView />
        <ReactionOverlay />
      </>
    )
  }

  return (
    <>
      {/* Ambient background video renders behind the canvas (z-index 0) */}
      {/* Foreground overlay videos render above everything (z-index 20/50) */}
      <BlackjackVideoOverlay />

      <Canvas
        shadows={{ type: PCFShadowMap }}
        gl={CANVAS_GL_CONFIG}
        dpr={1}
        camera={{ fov: 50, near: 0.1, far: 100, position: [0, 5, 5] }}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      >
        <Suspense fallback={null}>
          <SceneRouter />
        </Suspense>
      </Canvas>
      <CasinoHUD />
      <ReactionOverlay />
    </>
  )
}

function ConnectedApp({ sessionId, serverUrl }: { sessionId: string; serverUrl: string }) {
  const transport = useMemo(
    () => createSocketIOClientTransport({
      url: serverUrl,
      query: {
        sessionId,
        userId: getDisplayUserId(),
        clientType: ClientType.Display,
      },
      socketOptions: { transports: ['polling', 'websocket'] },
    }),
    [sessionId, serverUrl],
  )

  return (
    <SessionIdContext value={sessionId}>
      <VGFProvider transport={transport}>
        <DisplayRouter />
      </VGFProvider>
    </SessionIdContext>
  )
}

const CardTestPage = import.meta.env.DEV
  ? lazy(() => import('./card-test.js').then(m => ({ default: m.CardTestPage })))
  : null

export function App() {
  // Card rendering test mode (dev only): http://localhost:5173/?test=cards
  if (import.meta.env.DEV && CardTestPage && new URLSearchParams(window.location.search).get('test') === 'cards') {
    return <Suspense fallback={<div style={{ color: 'white', padding: 40 }}>Loading card test...</div>}><CardTestPage /></Suspense>
  }

  const devParams = useMemo(() => getDevParams(), [])
  const effectiveServerUrl = devParams.serverUrl ?? SERVER_URL

  const [sessionId, setSessionId] = useState<string | null>(
    devParams.sessionId ?? null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Skip session creation when a sessionId was provided via URL param
    if (devParams.sessionId) return

    createSession(effectiveServerUrl)
      .then((id) => setSessionId(id))
      .catch((err) => setError(String(err)))
  }, [devParams.sessionId, effectiveServerUrl])

  if (error) {
    return (
      <div style={{ color: '#ff6b6b', textAlign: 'center', paddingTop: '40vh', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Failed to create session</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div style={{ color: 'white', textAlign: 'center', paddingTop: '40vh', fontFamily: 'system-ui, sans-serif' }}>
        <h1>Weekend Casino</h1>
        <p>Creating session...</p>
      </div>
    )
  }

  return (
    <MaybePlatformProvider>
      <InputModeProvider>
        <ConnectedApp sessionId={sessionId} serverUrl={effectiveServerUrl} />
      </InputModeProvider>
    </MaybePlatformProvider>
  )
}
