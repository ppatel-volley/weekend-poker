import { useState } from 'react'
import type { CasinoGame, GameNightTheme } from '@weekend-casino/shared'
import {
  CASINO_GAME_LABELS,
  V1_GAMES,
  V2_0_GAMES,
  GN_MIN_GAMES,
  GN_MAX_GAMES,
  GN_DEFAULT_ROUNDS_PER_GAME,
  GN_THEMES,
  GN_DEFAULT_THEME,
} from '@weekend-casino/shared'
import {
  useDispatch,
  useSessionMemberSafe,
  useStateSync,
} from '../../hooks/useVGFHooks.js'

const THEME_LABELS: Record<GameNightTheme, string> = {
  classic: 'Classic',
  neon: 'Neon',
  high_roller: 'High Roller',
  tropical: 'Tropical',
}

/**
 * Game Night setup controller — host picks games, rounds, theme, then starts.
 * Non-host players see a read-only view.
 */
export function GameNightSetupController() {
  const dispatch = useDispatch()
  const member = useSessionMemberSafe()
  const state = useStateSync()

  const [selectedGames, setSelectedGames] = useState<CasinoGame[]>([])
  const [roundsPerGame, setRoundsPerGame] = useState(GN_DEFAULT_ROUNDS_PER_GAME)
  const [theme, setTheme] = useState<GameNightTheme>(GN_DEFAULT_THEME)

  const players = (state?.players ?? []) as Array<{ id: string; isHost: boolean }>
  const isHost = players.some(
    (p) => p.id === member?.sessionMemberId && p.isHost,
  )

  const toggleGame = (game: CasinoGame) => {
    setSelectedGames((prev) => {
      if (prev.includes(game)) return prev.filter((g) => g !== game)
      if (prev.length >= GN_MAX_GAMES) return prev
      return [...prev, game]
    })
  }

  const handleStart = () => {
    if (!member?.sessionMemberId) return
    if (selectedGames.length < GN_MIN_GAMES) return
    ;(dispatch as (name: string, ...args: unknown[]) => void)(
      'gnInitGameNight',
      selectedGames,
      roundsPerGame,
      theme,
    )
    ;(dispatch as (name: string, ...args: unknown[]) => void)('gnConfirmSetup')
  }

  const allGames = [...V1_GAMES, ...V2_0_GAMES]
  const canStart = selectedGames.length >= GN_MIN_GAMES

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 20px 40px',
        color: 'white',
        fontFamily: "'Georgia', 'Garamond', 'Times New Roman', serif",
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(80, 40, 0, 0.3) 0%, transparent 60%), ' +
          'linear-gradient(180deg, #0d1a2a 0%, #0a0f18 50%, #060a10 100%)',
      }}
    >
      <h1
        style={{
          fontSize: '22px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          marginBottom: '4px',
          background: 'linear-gradient(135deg, #d4af37, #f5d680, #d4af37)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        GAME NIGHT
      </h1>
      <div
        style={{
          width: '100px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.6), transparent)',
          marginBottom: '20px',
        }}
      />

      {!isHost && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '15px',
          }}
        >
          <p style={{ marginBottom: '8px', fontWeight: 600, color: 'rgba(212, 175, 55, 0.8)' }}>
            Waiting for host...
          </p>
          <p style={{ fontSize: '13px' }}>The host is setting up Game Night</p>
        </div>
      )}

      {isHost && (
        <>
          {/* Game selection */}
          <p
            style={{
              alignSelf: 'flex-start',
              fontSize: '11px',
              marginBottom: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(212, 175, 55, 0.6)',
              fontWeight: 400,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Select {GN_MIN_GAMES}-{GN_MAX_GAMES} games ({selectedGames.length} selected)
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              width: '100%',
              marginBottom: '20px',
            }}
          >
            {allGames.map((game) => {
              const isSelected = selectedGames.includes(game)
              return (
                <button
                  key={game}
                  data-testid={`gn-game-${game}`}
                  onClick={() => toggleGame(game)}
                  style={{
                    padding: '12px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '12px',
                    border: isSelected
                      ? '2px solid rgba(212, 175, 55, 0.7)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isSelected
                      ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)'
                      : 'linear-gradient(145deg, rgba(30, 40, 60, 0.8) 0%, rgba(20, 28, 45, 0.8) 100%)',
                    color: isSelected ? '#f5d680' : 'white',
                    cursor: 'pointer',
                    fontFamily: 'system-ui, sans-serif',
                    textAlign: 'center',
                  }}
                >
                  {CASINO_GAME_LABELS[game]}
                </button>
              )
            })}
          </div>

          {/* Rounds per game */}
          <p
            style={{
              alignSelf: 'flex-start',
              fontSize: '11px',
              marginBottom: '8px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(212, 175, 55, 0.6)',
              fontWeight: 400,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Rounds per game
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <button
              data-testid="gn-rounds-minus"
              onClick={() => setRoundsPerGame((r) => Math.max(3, r - 1))}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                background: 'rgba(30, 40, 60, 0.8)',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              -
            </button>
            <span
              data-testid="gn-rounds-value"
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#f5d680',
                minWidth: '40px',
                textAlign: 'center',
              }}
            >
              {roundsPerGame}
            </span>
            <button
              data-testid="gn-rounds-plus"
              onClick={() => setRoundsPerGame((r) => Math.min(10, r + 1))}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                background: 'rgba(30, 40, 60, 0.8)',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              +
            </button>
          </div>

          {/* Theme selector */}
          <p
            style={{
              alignSelf: 'flex-start',
              fontSize: '11px',
              marginBottom: '8px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(212, 175, 55, 0.6)',
              fontWeight: 400,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Theme
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              width: '100%',
              marginBottom: '24px',
            }}
          >
            {GN_THEMES.map((t) => (
              <button
                key={t}
                data-testid={`gn-theme-${t}`}
                onClick={() => setTheme(t)}
                style={{
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border:
                    theme === t
                      ? '2px solid rgba(212, 175, 55, 0.7)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  background:
                    theme === t
                      ? 'linear-gradient(145deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)'
                      : 'linear-gradient(145deg, rgba(30, 40, 60, 0.8) 0%, rgba(20, 28, 45, 0.8) 100%)',
                  color: theme === t ? '#f5d680' : 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontFamily: 'system-ui, sans-serif',
                  textTransform: 'capitalize',
                }}
              >
                {THEME_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Start button */}
          <button
            data-testid="gn-start-button"
            onClick={handleStart}
            disabled={!canStart}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '18px',
              fontWeight: 'bold',
              borderRadius: '14px',
              border: '2px solid rgba(212, 175, 55, 0.4)',
              cursor: canStart ? 'pointer' : 'not-allowed',
              background: canStart
                ? 'linear-gradient(135deg, #8B6914 0%, #6B4F10 100%)'
                : 'linear-gradient(135deg, rgba(60, 60, 60, 0.5) 0%, rgba(40, 40, 40, 0.5) 100%)',
              color: canStart ? 'white' : 'rgba(255, 255, 255, 0.3)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: canStart ? '0 4px 20px rgba(212, 175, 55, 0.3)' : 'none',
              opacity: canStart ? 1 : 0.6,
            }}
          >
            START GAME NIGHT
          </button>
          {!canStart && (
            <p
              style={{
                marginTop: '8px',
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '12px',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              Select at least {GN_MIN_GAMES} games to start
            </p>
          )}
        </>
      )}
    </div>
  )
}
