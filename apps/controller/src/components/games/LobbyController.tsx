import { useState } from 'react'
import type { CasinoGame, CasinoGameState } from '@weekend-casino/shared'
import { CASINO_GAME_LABELS, V1_GAMES } from '@weekend-casino/shared'
import {
  useClientActions,
  useSessionMember,
  useDispatch,
  useStateSync,
} from '../../hooks/useVGFHooks.js'

/**
 * Lobby controller — game selection + ready-up UI.
 *
 * Extends the original ControllerLobby with game selection
 * when in GAME_SELECT phase, and keeps the name + ready flow.
 */
export function LobbyController() {
  const [name, setName] = useState('')
  const { toggleReady, updateState } = useClientActions()
  const dispatch = useDispatch()
  const member = useSessionMember()
  const state = useStateSync() as CasinoGameState | null
  const isReady = member.isReady
  const selectedGame = state?.selectedGame ?? null

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    updateState({ displayName: value })
  }

  const handleReady = () => {
    toggleReady()
    if (name.trim()) {
      ;(dispatch as (name: string, ...args: unknown[]) => void)(
        'updatePlayerName', member.sessionMemberId, name.trim(),
      )
    }
    ;(dispatch as (name: string, ...args: unknown[]) => void)(
      'checkLobbyReady',
    )
  }

  const handleSelectGame = (game: CasinoGame) => {
    ;(dispatch as (name: string, ...args: unknown[]) => void)(
      'selectGame', game,
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
      <h1 style={{ fontSize: '24px', marginBottom: '24px' }}>Weekend Casino</h1>

      {/* Name input */}
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

      {/* Game selection grid */}
      <p style={{ alignSelf: 'flex-start', fontSize: '14px', marginBottom: '12px' }}>
        Choose a game
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          width: '100%',
          marginBottom: '24px',
        }}
      >
        {V1_GAMES.map((game) => (
          <button
            key={game}
            onClick={() => handleSelectGame(game)}
            style={{
              padding: '14px 8px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '10px',
              border: selectedGame === game ? '2px solid #4ade80' : '1px solid #444',
              background: selectedGame === game ? 'rgba(74, 222, 128, 0.15)' : '#2a2a3e',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {CASINO_GAME_LABELS[game]}
          </button>
        ))}
      </div>

      <p style={{ color: '#888', marginBottom: '24px' }}>
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
