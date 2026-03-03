import { useStateSync } from '../../hooks/useVGFHooks.js'
import { CASINO_GAME_LABELS } from '@weekend-casino/shared'
import type { CasinoGame } from '@weekend-casino/shared'

interface PlayerScore {
  playerId: string
  playerName: string
  totalScore: number
  gamesPlayed: number
}

interface GameResult {
  game: CasinoGame
  rankings: Array<{ playerId: string; totalGameScore: number }>
}

/**
 * Game Night leaderboard controller — read-only view during GN_LEADERBOARD.
 * Shows rankings, scores, and upcoming game indicator.
 */
export function GameNightLeaderboardController() {
  const state = useStateSync()
  const gn = state?.gameNight as {
    playerScores?: Record<string, PlayerScore>
    gameLineup?: CasinoGame[]
    currentGameIndex?: number
    gameResults?: GameResult[]
  } | undefined

  const playerScores = gn?.playerScores ?? {}
  const gameLineup = gn?.gameLineup ?? []
  const currentGameIndex = gn?.currentGameIndex ?? 0
  const gameResults = gn?.gameResults ?? []

  // Sort players by total score descending
  const rankings = Object.values(playerScores).sort(
    (a, b) => b.totalScore - a.totalScore,
  )

  // Determine the next game (if any)
  const nextGameIndex = currentGameIndex + 1
  const nextGame = nextGameIndex < gameLineup.length ? gameLineup[nextGameIndex] : null

  // Latest game result for "score this game"
  const latestResult = gameResults.length > 0 ? gameResults[gameResults.length - 1] : null

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
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          marginBottom: '4px',
          background: 'linear-gradient(135deg, #d4af37, #f5d680, #d4af37)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        LEADERBOARD
      </h1>
      <div
        style={{
          width: '100px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.6), transparent)',
          marginBottom: '20px',
        }}
      />

      {/* Rankings list */}
      <div style={{ width: '100%', marginBottom: '24px' }}>
        {rankings.length === 0 && (
          <p
            style={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '14px',
            }}
          >
            No scores yet
          </p>
        )}
        {rankings.map((player, idx) => {
          const rank = idx + 1
          const lastGameScore = latestResult
            ? latestResult.rankings.find((r) => r.playerId === player.playerId)?.totalGameScore ?? 0
            : 0

          return (
            <div
              key={player.playerId}
              data-testid={`gn-rank-${rank}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 14px',
                marginBottom: '8px',
                borderRadius: '12px',
                background:
                  rank === 1
                    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(30, 40, 60, 0.6) 0%, rgba(20, 28, 45, 0.6) 100%)',
                border:
                  rank === 1
                    ? '1px solid rgba(212, 175, 55, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: rank === 1 ? '#f5d680' : 'rgba(255, 255, 255, 0.5)',
                  minWidth: '30px',
                }}
              >
                #{rank}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'system-ui, sans-serif',
                  color: rank === 1 ? '#f5d680' : 'white',
                }}
              >
                {player.playerName}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: 'system-ui, sans-serif',
                  marginRight: '12px',
                }}
              >
                +{lastGameScore}
              </span>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: rank === 1 ? '#f5d680' : 'white',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {player.totalScore.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Next game indicator */}
      {nextGame && (
        <div
          data-testid="gn-next-game"
          style={{
            textAlign: 'center',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(74, 222, 128, 0.2)',
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08) 0%, rgba(74, 222, 128, 0.02) 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <p style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(74, 222, 128, 0.6)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Next Game
          </p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(74, 222, 128, 0.9)' }}>
            {CASINO_GAME_LABELS[nextGame]}
          </p>
        </div>
      )}

      {!nextGame && (
        <div
          style={{
            textAlign: 'center',
            padding: '14px 20px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <p style={{ fontSize: '14px', color: 'rgba(212, 175, 55, 0.8)', fontWeight: 600 }}>
            Final standings
          </p>
        </div>
      )}
    </div>
  )
}
