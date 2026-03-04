import { useProfile } from '../hooks/useProfile.js'
import type { PersistentPlayerStats } from '@weekend-casino/shared'
import { PLAYER_LEVEL_XP_THRESHOLDS, DAILY_BONUS_SCHEDULE, DAILY_BONUS_STREAK_MULTIPLIER } from '@weekend-casino/shared'

export function ProfileView() {
  const { profile, loading, error, refetch } = useProfile()

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#aaa' }}>Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#ff6b6b' }}>{error}</p>
        <button onClick={refetch} style={retryButtonStyle}>
          Retry
        </button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#aaa' }}>No profile found.</p>
      </div>
    )
  }

  const { identity, stats, level, xp, dailyBonus } = profile
  const currentThreshold = PLAYER_LEVEL_XP_THRESHOLDS[level - 1] ?? 0
  const nextThreshold = PLAYER_LEVEL_XP_THRESHOLDS[level] ?? currentThreshold
  const xpProgress = nextThreshold > currentThreshold
    ? (xp - currentThreshold) / (nextThreshold - currentThreshold)
    : 1
  const winRate = stats.totalHandsPlayed > 0
    ? ((stats.totalHandsWon / stats.totalHandsPlayed) * 100).toFixed(1)
    : '0.0'

  const nextBonusDay = (dailyBonus.currentStreak % 7)
  const baseAmount = DAILY_BONUS_SCHEDULE[nextBonusDay] ?? DAILY_BONUS_SCHEDULE[0]!
  const nextBonusAmount = dailyBonus.currentStreak > 7
    ? Math.floor(baseAmount * DAILY_BONUS_STREAK_MULTIPLIER)
    : baseAmount

  return (
    <div style={containerStyle}>
      {/* Name + Level */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: '#d4af37' }}>
          {identity.displayName}
        </h2>
        <p style={{ margin: '4px 0 0', color: '#aaa', fontSize: 14 }}>
          Level {level}
        </p>
      </div>

      {/* XP Progress Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 4 }}>
          <span>XP</span>
          <span>{xp.toLocaleString()} / {nextThreshold.toLocaleString()}</span>
        </div>
        <div style={progressBarTrackStyle}>
          <div style={{ ...progressBarFillStyle, width: `${Math.min(xpProgress * 100, 100)}%` }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div style={statsGridStyle}>
        <StatCard label="Games Played" value={stats.totalGamesPlayed.toLocaleString()} />
        <StatCard label="Hands Won" value={stats.totalHandsWon.toLocaleString()} />
        <StatCard label="Win Rate" value={`${winRate}%`} />
        <StatCard label="Best Streak" value={stats.bestWinStreak.toString()} />
      </div>

      {/* Per-game breakdown */}
      {Object.keys(stats.byGameType).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 14, color: '#aaa', marginBottom: 8 }}>Per-Game Stats</h3>
          {Object.entries(stats.byGameType).map(([game, gs]) =>
            gs ? (
              <GameStatRow key={game} game={game} stats={gs} />
            ) : null
          )}
        </div>
      )}

      {/* Daily Bonus */}
      <div style={dailyBonusStyle}>
        <h3 style={{ fontSize: 14, color: '#d4af37', margin: '0 0 4px' }}>Daily Bonus</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#ccc' }}>
          Streak: {dailyBonus.currentStreak} day{dailyBonus.currentStreak !== 1 ? 's' : ''}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#ccc' }}>
          Next bonus: {nextBonusAmount!.toLocaleString()} chips
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCardStyle}>
      <span style={{ fontSize: 18, fontWeight: 'bold', color: '#d4af37' }}>{value}</span>
      <span style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{label}</span>
    </div>
  )
}

function GameStatRow({ game, stats }: { game: string; stats: PersistentPlayerStats['byGameType'][string] }) {
  if (!stats) return null
  const wr = stats.handsPlayed > 0
    ? ((stats.handsWon / stats.handsPlayed) * 100).toFixed(0)
    : '0'
  return (
    <div style={gameRowStyle}>
      <span style={{ flex: 1, fontSize: 13 }}>{game.replace(/_/g, ' ')}</span>
      <span style={{ fontSize: 12, color: '#aaa', marginRight: 12 }}>{stats.gamesPlayed}G</span>
      <span style={{ fontSize: 12, color: '#aaa' }}>{wr}% WR</span>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  padding: 16,
  minHeight: '100%',
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  background: '#1a1a2e',
  overflowY: 'auto',
}

const retryButtonStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '8px 20px',
  background: '#d4af37',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: 6,
  fontWeight: 'bold',
  cursor: 'pointer',
}

const progressBarTrackStyle: React.CSSProperties = {
  height: 8,
  background: 'rgba(255,255,255,0.1)',
  borderRadius: 4,
  overflow: 'hidden',
}

const progressBarFillStyle: React.CSSProperties = {
  height: '100%',
  background: '#d4af37',
  borderRadius: 4,
  transition: 'width 0.3s ease',
}

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
}

const statCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: 12,
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 8,
}

const dailyBonusStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  background: 'rgba(212,175,55,0.1)',
  borderRadius: 8,
  border: '1px solid rgba(212,175,55,0.3)',
}

const gameRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
}
