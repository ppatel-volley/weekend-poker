import { useState, useMemo } from 'react'
import {
  VGFProvider,
  createSocketIOClientTransport,
} from '@volley/vgf/client'
import { ClientType } from '@volley/vgf/types'
import { ControllerPhaseRouter } from './components/ControllerPhaseRouter.js'

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

/**
 * Retrieve or generate a persistent user ID for this browser session.
 * Stored in sessionStorage so a page refresh within the same tab keeps
 * the same identity, but a new tab gets a fresh one.
 */
function getOrCreateUserId(): string {
  const key = 'weekend-poker-user-id'
  let userId = sessionStorage.getItem(key)
  if (!userId) {
    userId = crypto.randomUUID()
    sessionStorage.setItem(key, userId)
  }
  return userId
}

export function App() {
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('sessionId')
  }, [])

  const [userId] = useState(getOrCreateUserId)

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
      socketOptions: { transports: ['polling', 'websocket'] },
    }),
    [sessionId, userId],
  )

  return (
    <VGFProvider transport={transport}>
      <ControllerPhaseRouter />
    </VGFProvider>
  )
}
