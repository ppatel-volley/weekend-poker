import { useState } from 'react'
import { useClientActions, useSessionMember, useDispatch } from '../hooks/useVGFHooks.js'

/**
 * Mobile-optimised lobby screen.
 *
 * Players enter their display name, choose an avatar, and tap READY.
 * Whilst waiting for the host, a status message is shown.
 */
export function ControllerLobby() {
  const [name, setName] = useState('')
  const { toggleReady, updateState } = useClientActions()
  const dispatch = useDispatch()
  const member = useSessionMember()
  const isReady = member.isReady

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    updateState({ displayName: value })
  }

  const handleReady = () => {
    // Toggle VGF member readiness first
    toggleReady()
    // Ensure the server-side player name is up to date
    if (name.trim()) {
      ;(dispatch as (name: string, ...args: unknown[]) => void)(
        'updatePlayerName', member.sessionMemberId, name.trim(),
      )
    }
    // Dispatch a no-op reducer to trigger endIf evaluation after toggleReady.
    // endIf checks ctx.session.members directly for ready controllers.
    ;(dispatch as (name: string, ...args: unknown[]) => void)(
      'checkLobbyReady',
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        background: '#1a1a2e',
      }}
    >
      <h1 style={{ fontSize: '24px', marginBottom: '32px' }}>Weekend Poker</h1>

      <label
        htmlFor="player-name"
        style={{ alignSelf: 'flex-start', marginBottom: '8px', fontSize: '14px' }}
      >
        Your Name
      </label>
      <input
        id="player-name"
        type="text"
        value={name}
        onChange={handleNameChange}
        placeholder="Enter your name"
        maxLength={20}
        style={{
          width: '100%',
          padding: '14px',
          fontSize: '18px',
          borderRadius: '8px',
          border: '1px solid #444',
          background: '#2a2a3e',
          color: 'white',
          marginBottom: '24px',
        }}
      />

      {/* TODO: Avatar selection grid — 8 circles, tap to select */}
      <p style={{ color: '#888', marginBottom: '32px' }}>
        Avatar selection coming soon
      </p>

      <button
        style={{
          width: '100%',
          padding: '18px',
          fontSize: '20px',
          fontWeight: 'bold',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          background: isReady ? '#2E7D32' : '#4CAF50',
          color: 'white',
        }}
        onClick={handleReady}
      >
        {isReady ? 'READY \u2713' : 'READY'}
      </button>

      <p style={{ marginTop: '24px', color: '#888' }}>
        {isReady ? 'Waiting for host to start...' : 'Enter your name and tap READY'}
      </p>
    </div>
  )
}
