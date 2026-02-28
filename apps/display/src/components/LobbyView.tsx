import { ClientType } from '@volley/vgf/client'
import { QRCodeSVG } from 'qrcode.react'
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useSessionMembers } from '../hooks/useVGFHooks.js'
import { useSessionId } from '../hooks/useSessionId.js'
import { MAX_PLAYERS } from '@weekend-casino/shared'
import { usePlatform } from '../platform/PlatformContext.js'

/** Focus indicator styles for TV remote navigation. */
const focusOutline = '2px solid #4ade80'
const focusShadow = '0 0 12px rgba(74, 222, 128, 0.5)'

/**
 * Lobby view displayed on the shared screen whilst waiting for players to join.
 *
 * Shows a title, join URL, and the list of connected players with ready state.
 * When on a TV platform, player list items are focusable via D-pad navigation.
 */
export function LobbyView() {
  const sessionId = useSessionId()
  const members = useSessionMembers()
  const { isTV } = usePlatform()
  const { ref: lobbyRef, focused: lobbyFocused } = useFocusable({
    focusKey: 'LOBBY',
    trackChildren: true,
    isFocusBoundary: true,
  })

  const baseControllerUrl = import.meta.env['VITE_CONTROLLER_URL'] as string | undefined
  const controllerUrl = baseControllerUrl
    ? `${baseControllerUrl}?sessionId=${sessionId}`
    : `http://${window.location.hostname}:5174?sessionId=${sessionId}`

  // Filter to only show Controller-type members (not Display or Orchestrator)
  const players = Object.values(members).filter(
    (m) => m.clientType === ClientType.Controller,
  )

  const readyCount = players.filter((p) => p.isReady).length
  const allReady = players.length >= 2 && readyCount === players.length

  return (
    <div
      ref={lobbyRef}
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
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Weekend Casino</h1>

      <div
        style={{
          padding: 16,
          background: 'white',
          borderRadius: 12,
          marginBottom: '1rem',
        }}
      >
        <QRCodeSVG value={controllerUrl} size={180} />
      </div>
      <a
        href={controllerUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          opacity: 0.6,
          fontSize: '0.8rem',
          marginBottom: '2rem',
          color: '#8bb4ff',
          textDecoration: 'underline',
          cursor: 'pointer',
          wordBreak: 'break-all',
          maxWidth: '90vw',
          textAlign: 'center',
        }}
      >
        {controllerUrl}
      </a>

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
              <FocusablePlayerItem
                key={p.sessionMemberId}
                displayName={(p.state.displayName as string) || 'Unnamed'}
                isReady={p.isReady}
                isConnected={p.connectionState === 'CONNECTED'}
                isTV={isTV}
              />
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

function FocusablePlayerItem({
  displayName,
  isReady,
  isConnected,
  isTV,
}: {
  displayName: string
  isReady: boolean
  isConnected: boolean
  isTV: boolean
}) {
  const { ref, focused } = useFocusable({ focusable: isTV })

  return (
    <li
      ref={ref}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0.5rem',
        opacity: isConnected ? 1 : 0.4,
        borderRadius: 6,
        outline: focused ? focusOutline : 'none',
        boxShadow: focused ? focusShadow : 'none',
        transition: 'outline 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: isReady ? '#4ade80' : '#6b7280',
          flexShrink: 0,
        }}
      />
      <span>{displayName}</span>
      {isReady && (
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.6 }}>
          Ready
        </span>
      )}
    </li>
  )
}
