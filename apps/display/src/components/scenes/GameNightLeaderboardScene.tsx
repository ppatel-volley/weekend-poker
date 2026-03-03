import { useState, useEffect, useMemo } from 'react'
import { useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import type { GameNightGameState, GameNightPlayerTotal } from '@weekend-casino/shared'
import { CASINO_GAME_LABELS, GN_LEADERBOARD_DISPLAY_MS } from '@weekend-casino/shared'

/** Rank badge colours (gold, silver, bronze, pewter). */
const RANK_COLOURS: Record<number, string> = {
  1: '#d4af37',
  2: '#c0c0c0',
  3: '#cd7f32',
  4: '#8a8a8a',
}

/** Rank badge labels. */
const RANK_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
}

/**
 * Game Night Leaderboard Scene — 2D HTML overlay shown between games.
 *
 * Displays animated player rankings sorted by total score,
 * a "next game" preview, and an auto-advance timer bar.
 */
export function GameNightLeaderboardScene() {
  const gameNight = useStateSyncSelector((s) => s.gameNight) as GameNightGameState | undefined
  const [elapsed, setElapsed] = useState(0)
  const [visible, setVisible] = useState(false)

  // Fade-in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => Math.min(prev + 100, GN_LEADERBOARD_DISPLAY_MS))
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const rankings = useMemo<GameNightPlayerTotal[]>(() => {
    if (!gameNight?.playerScores) return []
    return Object.values(gameNight.playerScores)
      .sort((a, b) => b.totalScore - a.totalScore)
  }, [gameNight?.playerScores])

  // Latest game result — score gained this game
  const latestResult = gameNight?.gameResults?.length
    ? gameNight.gameResults[gameNight.gameResults.length - 1]
    : null

  const nextGameIndex = (gameNight?.currentGameIndex ?? 0) + 1
  const nextGame =
    gameNight?.gameLineup && nextGameIndex < gameNight.gameLineup.length
      ? gameNight.gameLineup[nextGameIndex] ?? null
      : null

  const timerProgress = Math.min(elapsed / GN_LEADERBOARD_DISPLAY_MS, 1)
  const gameNumber = (gameNight?.currentGameIndex ?? 0) + 1
  const totalGames = gameNight?.gameLineup?.length ?? 0

  return (
    <div
      style={{
        ...containerStyle,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
      data-testid="gn-leaderboard-scene"
    >
      {/* Title */}
      <div style={titleStyle}>
        <span style={titleAccentStyle}>GAME NIGHT</span>
        <span style={titleMainStyle}>LEADERBOARD</span>
        <span style={gameCountStyle}>Game {gameNumber} of {totalGames}</span>
      </div>

      {/* Rankings */}
      <div style={rankingsContainerStyle}>
        {rankings.map((player, index) => {
          const rank = index + 1
          const gameScore = latestResult?.rankings?.find(
            (r) => r.playerId === player.playerId,
          )?.totalGameScore ?? 0

          return (
            <div
              key={player.playerId}
              style={{
                ...rankRowStyle,
                animationDelay: `${index * 0.15}s`,
                borderLeft: `4px solid ${RANK_COLOURS[rank] ?? '#555'}`,
              }}
              data-testid={`gn-rank-${rank}`}
            >
              {/* Rank badge */}
              <div
                style={{
                  ...rankBadgeStyle,
                  background: RANK_COLOURS[rank] ?? '#555',
                }}
              >
                {RANK_LABELS[rank] ?? `${rank}th`}
              </div>

              {/* Player name */}
              <div style={playerNameStyle}>
                {player.playerName || player.playerId.slice(0, 8)}
              </div>

              {/* Score gained this game */}
              <div style={gameScoreStyle}>
                {gameScore > 0 ? `+${gameScore}` : gameScore}
              </div>

              {/* Total score */}
              <div style={totalScoreStyle}>
                {player.totalScore}
              </div>
            </div>
          )
        })}
      </div>

      {/* Next game preview */}
      {nextGame && (
        <div style={nextGameStyle}>
          Next up: <strong>{CASINO_GAME_LABELS[nextGame]}</strong>
        </div>
      )}

      {!nextGame && (
        <div style={nextGameStyle}>
          Final standings
        </div>
      )}

      {/* Timer bar */}
      <div style={timerBarContainerStyle}>
        <div
          style={{
            ...timerBarFillStyle,
            width: `${timerProgress * 100}%`,
          }}
        />
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a0a 100%)',
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  zIndex: 20,
  padding: '2rem',
}

const titleStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '2rem',
}

const titleAccentStyle: React.CSSProperties = {
  fontFamily: "'Georgia', 'Garamond', serif",
  fontSize: '0.875rem',
  letterSpacing: '0.3em',
  color: 'rgba(212, 175, 55, 0.8)',
  textTransform: 'uppercase',
  marginBottom: '0.25rem',
}

const titleMainStyle: React.CSSProperties = {
  fontFamily: "'Georgia', 'Garamond', serif",
  fontSize: '2.5rem',
  fontWeight: 700,
  color: '#d4af37',
  textShadow: '0 0 20px rgba(212, 175, 55, 0.4), 0 2px 8px rgba(0,0,0,0.8)',
  letterSpacing: '0.1em',
}

const gameCountStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  opacity: 0.6,
  marginTop: '0.5rem',
}

const rankingsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  width: '100%',
  maxWidth: '600px',
}

const rankRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.75rem 1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '8px',
  animation: 'gnSlideIn 0.5s ease forwards',
  opacity: 0,
}

const rankBadgeStyle: React.CSSProperties = {
  width: '48px',
  height: '32px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '0.875rem',
  color: '#0a0a0a',
  flexShrink: 0,
}

const playerNameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: '1.125rem',
  fontWeight: 600,
  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
}

const gameScoreStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'rgba(74, 222, 128, 0.9)',
  fontWeight: 600,
  minWidth: '60px',
  textAlign: 'right',
}

const totalScoreStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#d4af37',
  minWidth: '80px',
  textAlign: 'right',
  textShadow: '0 0 8px rgba(212, 175, 55, 0.3)',
}

const nextGameStyle: React.CSSProperties = {
  marginTop: '2rem',
  fontSize: '1.125rem',
  color: 'rgba(255, 255, 255, 0.7)',
  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
}

const timerBarContainerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '4px',
  background: 'rgba(255, 255, 255, 0.1)',
}

const timerBarFillStyle: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #d4af37, rgba(212, 175, 55, 0.6))',
  transition: 'width 0.1s linear',
}
