import { useSessionMemberSafe } from '../../hooks/useVGFHooks.js'

/**
 * Player name, avatar placeholder, and connection status display.
 */
export function PlayerInfo() {
  const member = useSessionMemberSafe()
  const name = (member?.state?.displayName as string) || 'Player'
  const isConnected = !!member

  return (
    <div
      data-testid="player-info"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      {/* Avatar placeholder */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#4a4a6a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: '11px', color: isConnected ? '#4ade80' : '#ef4444' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  )
}
