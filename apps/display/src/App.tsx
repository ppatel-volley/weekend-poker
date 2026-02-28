import { useState, useEffect, useMemo, Suspense } from 'react'
import {
  VGFProvider,
  createSocketIOClientTransport,
  createSession,
} from '@volley/vgf/client'
import { ClientType } from '@volley/vgf/types'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace } from 'three'
import { SceneRouter } from './components/scenes/index.js'
import { CasinoHUD } from './components/hud/CasinoHUD.js'
import { LobbyView } from './components/LobbyView.js'
import { SessionIdContext } from './hooks/useSessionId.js'
import { usePhase } from './hooks/useVGFHooks.js'
import { MaybePlatformProvider, InputModeProvider } from './platform/index.js'
import { getDisplayUserId } from './utils/getDisplayUserId.js'
import { getDevParams } from './utils/getDevParams.js'

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

/**
 * Decides whether to show the 2D lobby overlay or the 3D canvas.
 * The 2D LobbyView handles QR code display and player list when
 * there's no 3D lobby scene to show that info in.
 */
function DisplayRouter() {
  const phase = usePhase()

  const isLobby = !phase || phase === 'LOBBY' || phase === 'GAME_SELECT'

  if (isLobby) {
    return <LobbyView />
  }

  return (
    <>
      <Canvas
        shadows={{ type: PCFShadowMap }}
        gl={{
          antialias: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace,
          powerPreference: 'high-performance',
        }}
        dpr={1}
        camera={{ fov: 45, near: 0.1, far: 100, position: [0, 8, 10] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <SceneRouter />
        </Suspense>
      </Canvas>
      <CasinoHUD />
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

export function App() {
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
