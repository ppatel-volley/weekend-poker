import { ClientType } from '@volley/vgf/client'
import { useSessionMembers } from '../hooks/useVGFHooks.js'
import { useSessionId } from '../hooks/useSessionId.js'
import { MAX_PLAYERS } from '@weekend-poker/shared'

/**
 * Lobby view displayed on the shared screen whilst waiting for players to join.
 *
 * Shows a title, join URL, and the list of connected players with ready state.
 */
export function LobbyView() {
  const sessionId = useSessionId()
  const members = useSessionMembers()
  const controllerUrl = `http://${window.location.hostname}:5174?sessionId=${sessionId}`

  // Filter to only show Controller-type members (not Display or Orchestrator)
  const players = Object.values(members).filter(
    (m) => m.clientType === ClientType.Controller,
  )

  const readyCount = players.filter((p) => p.isReady).length
  const allReady = players.length >= 2 && readyCount === players.length

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        background:
          'radial-gradient(ellipse at center, #1a3a1a 0%, #0a0a0a 80%)',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Weekend Poker</h1>

      {/* TODO: Replace with actual QR code component (e.g. qrcode.react) */}
      <div
        style={{
          width: 200,
          height: 200,
          border: '2px dashed rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          marginBottom: '2rem',
        }}
      >
        <span
          style={{
            opacity: 0.5,
            textAlign: 'center',
            padding: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {controllerUrl}
        </span>
      </div>

      {/* Connected players */}
      <div style={{ marginBottom: '2rem', minWidth: 260 }}>
        <h2
          style={{
            fontSize: '1.25rem',
            marginBottom: '0.75rem',
            opacity: 0.7,
            textAlign: 'center',
          }}
        >
          Players ({players.length}/{MAX_PLAYERS})
        </h2>
        {players.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {players.map((p) => (
              <li
                key={p.sessionMemberId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0',
                  opacity:
                    p.connectionState === 'CONNECTED' ? 1 : 0.4,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: p.isReady ? '#4ade80' : '#6b7280',
                    flexShrink: 0,
                  }}
                />
                <span>{(p.state.displayName as string) || 'Unnamed'}</span>
                {p.isReady && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.6 }}>
                    Ready
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ opacity: 0.5, textAlign: 'center' }}>No players yet</p>
        )}
      </div>

      {/* TODO: Add dealer character selection UI */}
      {/* TODO: Add blind level configuration */}

      {allReady ? (
        <p style={{ color: '#4ade80', fontSize: '1rem', fontWeight: 600 }}>
          All players ready! Game starting...
        </p>
      ) : (
        <p style={{ opacity: 0.5, fontSize: '0.875rem' }}>
          Waiting for players...
        </p>
      )}
    </div>
  )
}
