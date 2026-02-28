import { useState, useMemo } from 'react'
import {
  VGFProvider,
  createSocketIOClientTransport,
} from '@volley/vgf/client'
import { ClientType } from '@volley/vgf/types'
import { GameRouter } from './components/GameRouter.js'
import { WalletDisplay } from './components/shared/WalletDisplay.js'
import { PlayerInfo } from './components/shared/PlayerInfo.js'
import { VoiceButton } from './components/shared/VoiceButton.js'
import { usePhase } from './hooks/useVGFHooks.js'

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  'http://localhost:3000'

/**
 * Retrieve or generate a persistent user ID for this browser session.
 * Stored in sessionStorage so a page refresh within the same tab keeps
 * the same identity, but a new tab gets a fresh one.
 */
function getOrCreateUserId(): string {
  const key = 'weekend-casino-user-id'
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

      {/* Game-specific content */}
      <div style={{ flex: 1 }}>
        <GameRouter />
      </div>

      {/* Voice button footer */}
      <div style={{ padding: '12px 16px 16px' }}>
        <VoiceButton />
      </div>
    </div>
  )
}
