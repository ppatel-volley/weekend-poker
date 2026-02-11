import { useState, useEffect, useMemo } from 'react'
import {
  VGFProvider,
  createSocketIOClientTransport,
  createSession,
} from '@volley/vgf/client'
import { ClientType } from '@volley/vgf/types'
import { PhaseRouter } from './components/PhaseRouter.js'
import { SessionIdContext } from './hooks/useSessionId.js'

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

function ConnectedApp({ sessionId }: { sessionId: string }) {
  const transport = useMemo(
    () => createSocketIOClientTransport({
      url: SERVER_URL,
      query: {
        sessionId,
        userId: 'display-1',
        clientType: ClientType.Display,
      },
      socketOptions: { transports: ['polling', 'websocket'] },
    }),
    [sessionId],
  )

  return (
    <SessionIdContext value={sessionId}>
      <VGFProvider transport={transport}>
        <PhaseRouter />
      </VGFProvider>
    </SessionIdContext>
  )
}

export function App() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createSession(SERVER_URL)
      .then((id) => setSessionId(id))
      .catch((err) => setError(String(err)))
  }, [])

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
        <h1>Weekend Poker</h1>
        <p>Creating session...</p>
      </div>
    )
  }

  return <ConnectedApp sessionId={sessionId} />
}
