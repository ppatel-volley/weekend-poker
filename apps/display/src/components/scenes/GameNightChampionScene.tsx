import { useState, useEffect, useMemo } from 'react'
import { useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import type { GameNightGameState, GameNightPlayerTotal } from '@weekend-casino/shared'

/** Staggered reveal delays per rank (4th revealed first, champion last). */
const REVEAL_DELAYS: Record<number, number> = {
  4: 500,
  3: 2000,
  2: 3500,
  1: 5500,
}

/** Rank colours. */
const RANK_COLOURS: Record<number, string> = {
  1: '#d4af37',
  2: '#c0c0c0',
  3: '#cd7f32',
  4: '#8a8a8a',
}

/** Rank labels. */
const RANK_LABELS: Record<number, string> = {
  1: 'CHAMPION',
  2: '2nd Place',
  3: '3rd Place',
  4: '4th Place',
}

/**
 * Game Night Champion Scene — dramatic reveal of final standings.
 *
 * Reveals players from 4th to 1st with staggered delays.
 * Champion gets a large display with crown decoration and stats.
 */
export function GameNightChampionScene() {
  const gameNight = useStateSyncSelector((s) => s.gameNight) as GameNightGameState | undefined
  const [revealedRanks, setRevealedRanks] = useState<Set<number>>(new Set())
  const [showReturnText, setShowReturnText] = useState(false)

  const sortedPlayers = useMemo<GameNightPlayerTotal[]>(() => {
    if (!gameNight?.playerScores) return []
    return Object.values(gameNight.playerScores)
      .sort((a, b) => b.totalScore - a.totalScore)
  }, [gameNight?.playerScores])

  // Staggered reveal timers
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    for (const [rank, delay] of Object.entries(REVEAL_DELAYS)) {
      timers.push(
        setTimeout(() => {
          setRevealedRanks((prev) => new Set([...prev, Number(rank)]))
        }, delay),
      )
    }

    // Show "return to lobby" after all reveals
    timers.push(
      setTimeout(() => setShowReturnText(true), 7500),
    )

    return () => timers.forEach(clearTimeout)
  }, [])

  const champion = sortedPlayers[0] ?? null
  const firstPlaceCount = champion
    ? (gameNight?.gameResults ?? []).filter((gr) =>
        gr.rankings[0]?.playerId === champion.playerId,
      ).length
    : 0

  return (
    <div style={containerStyle} data-testid="gn-champion-scene">
      {/* Reverse order: show 4th first (bottom), champion last (top) */}
      <div style={revealContainerStyle}>
        {sortedPlayers.map((player, index) => {
          const rank = index + 1
          const isRevealed = revealedRanks.has(rank)
          const isChampion = rank === 1

          return (
            <div
              key={player.playerId}
              style={{
                ...rankCardStyle,
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed
                  ? 'scale(1) translateY(0)'
                  : 'scale(0.8) translateY(20px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                order: rank,
              }}
              data-testid={`gn-champion-rank-${rank}`}
            >
              {isChampion ? (
                <ChampionCard
                  player={player}
                  gamesWon={firstPlaceCount}
                  isRevealed={isRevealed}
                />
              ) : (
                <RunnerUpCard
                  player={player}
                  rank={rank}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Return to lobby */}
      <div
        style={{
          ...returnTextStyle,
          opacity: showReturnText ? 0.6 : 0,
          transition: 'opacity 1s ease',
        }}
      >
        Returning to lobby...
      </div>
    </div>
  )
}

function ChampionCard({
  player,
  gamesWon,
  isRevealed,
}: {
  player: GameNightPlayerTotal
  gamesWon: number
  isRevealed: boolean
}) {
  return (
    <div style={championContainerStyle}>
      {/* Crown decoration (CSS) */}
      <div
        style={{
          ...crownStyle,
          opacity: isRevealed ? 1 : 0,
          transform: isRevealed ? 'scale(1)' : 'scale(0.5)',
          transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
        }}
      >
        {/* Star crown using CSS borders and unicode */}
        <span style={crownStarStyle}>&#9733;</span>
        <span style={crownMainStyle}>&#9733; &#9733; &#9733;</span>
        <span style={crownStarStyle}>&#9733;</span>
      </div>

      {/* Champion name */}
      <div
        style={{
          ...championNameStyle,
          textShadow: isRevealed
            ? '0 0 30px rgba(212, 175, 55, 0.6), 0 0 60px rgba(212, 175, 55, 0.3), 0 2px 8px rgba(0,0,0,0.8)'
            : 'none',
        }}
      >
        {player.playerName || player.playerId.slice(0, 8)}
      </div>

      <div style={championTitleStyle}>CHAMPION</div>

      {/* Stats card */}
      <div style={statsCardStyle}>
        <div style={statItemStyle}>
          <span style={statValueStyle}>{player.totalScore}</span>
          <span style={statLabelStyle}>Total Score</span>
        </div>
        <div style={statDividerStyle} />
        <div style={statItemStyle}>
          <span style={statValueStyle}>{gamesWon}</span>
          <span style={statLabelStyle}>Games Won</span>
        </div>
        <div style={statDividerStyle} />
        <div style={statItemStyle}>
          <span style={statValueStyle}>{player.bestFinish === 1 ? '1st' : `${player.bestFinish}th`}</span>
          <span style={statLabelStyle}>Best Finish</span>
        </div>
      </div>
    </div>
  )
}

function RunnerUpCard({
  player,
  rank,
}: {
  player: GameNightPlayerTotal
  rank: number
}) {
  return (
    <div style={runnerUpContainerStyle}>
      <div
        style={{
          ...runnerUpBadgeStyle,
          background: RANK_COLOURS[rank] ?? '#555',
        }}
      >
        {RANK_LABELS[rank] ?? `${rank}th`}
      </div>
      <div style={runnerUpNameStyle}>
        {player.playerName || player.playerId.slice(0, 8)}
      </div>
      <div style={runnerUpScoreStyle}>{player.totalScore}</div>
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
  background: 'radial-gradient(ellipse at center, #1a1a0a 0%, #0a0a1a 60%, #000000 100%)',
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  zIndex: 20,
  overflow: 'hidden',
}

const revealContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1rem',
  width: '100%',
  maxWidth: '700px',
  padding: '2rem',
}

const rankCardStyle: React.CSSProperties = {
  width: '100%',
}

const championContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '2rem',
  marginBottom: '1rem',
}

const crownStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  marginBottom: '0.5rem',
}

const crownStarStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  color: 'rgba(212, 175, 55, 0.6)',
}

const crownMainStyle: React.CSSProperties = {
  fontSize: '2rem',
  color: '#d4af37',
  textShadow: '0 0 15px rgba(212, 175, 55, 0.5)',
  letterSpacing: '0.5rem',
}

const championNameStyle: React.CSSProperties = {
  fontFamily: "'Georgia', 'Garamond', serif",
  fontSize: '3rem',
  fontWeight: 700,
  color: '#d4af37',
  letterSpacing: '0.05em',
}

const championTitleStyle: React.CSSProperties = {
  fontFamily: "'Georgia', 'Garamond', serif",
  fontSize: '0.875rem',
  letterSpacing: '0.4em',
  color: 'rgba(212, 175, 55, 0.7)',
  marginTop: '0.25rem',
}

const statsCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem',
  marginTop: '1.5rem',
  padding: '1rem 2rem',
  background: 'rgba(212, 175, 55, 0.08)',
  border: '1px solid rgba(212, 175, 55, 0.2)',
  borderRadius: '12px',
}

const statItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.25rem',
}

const statValueStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#d4af37',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  color: 'rgba(255, 255, 255, 0.5)',
  textTransform: 'uppercase',
}

const statDividerStyle: React.CSSProperties = {
  width: '1px',
  height: '40px',
  background: 'rgba(212, 175, 55, 0.2)',
}

const runnerUpContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.625rem 1rem',
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '8px',
}

const runnerUpBadgeStyle: React.CSSProperties = {
  padding: '0.25rem 0.75rem',
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '0.75rem',
  color: '#0a0a0a',
  flexShrink: 0,
}

const runnerUpNameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: '1rem',
  fontWeight: 600,
  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
}

const runnerUpScoreStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  color: 'rgba(255, 255, 255, 0.8)',
}

const returnTextStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '2rem',
  fontSize: '0.875rem',
  letterSpacing: '0.1em',
  color: 'rgba(255, 255, 255, 0.6)',
}
