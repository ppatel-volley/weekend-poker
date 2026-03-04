import { useStateSync, useDispatch } from '../../hooks/useVGFHooks.js'

interface PlayerScore {
  playerId: string
  playerName: string
  totalScore: number
  gamesPlayed: number
}

/**
 * Game Night champion ceremony controller.
 * Shows the winner, share results button, and return to lobby.
 */
export function GameNightChampionController() {
  const state = useStateSync()
  const dispatch = useDispatch()
  const gn = state?.gameNight as {
    championId?: string | null
    playerScores?: Record<string, PlayerScore>
    gameLineup?: string[]
    gameResults?: unknown[]
  } | undefined

  const championId = gn?.championId ?? null
  const playerScores = gn?.playerScores ?? {}
  const champion = championId ? playerScores[championId] : null
  const totalGames = gn?.gameResults?.length ?? 0

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const handleShare = async () => {
    if (!canShare || !champion) return
    try {
      await navigator.share({
        title: 'Weekend Casino - Game Night',
        text: `${champion.playerName} won Game Night with ${champion.totalScore} points across ${totalGames} games!`,
      })
    } catch {
      // User cancelled or share failed — no action needed
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 20px 40px',
        color: 'white',
        fontFamily: "'Georgia', 'Garamond', 'Times New Roman', serif",
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.15) 0%, transparent 60%), ' +
          'linear-gradient(180deg, #0d1a2a 0%, #0a0f18 50%, #060a10 100%)',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: '8px',
        }}
      >
        {'\u{1F3C6}'}
      </div>

      <h1
        data-testid="gn-champion-title"
        style={{
          fontSize: '24px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          marginBottom: '4px',
          background: 'linear-gradient(135deg, #d4af37, #f5d680, #d4af37)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
        }}
      >
        CHAMPION
      </h1>

      <div
        style={{
          width: '100px',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.6), transparent)',
          marginBottom: '24px',
        }}
      />

      {champion ? (
        <>
          <p
            data-testid="gn-champion-name"
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#f5d680',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            {champion.playerName}
          </p>
          <p
            data-testid="gn-champion-score"
            style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontFamily: 'system-ui, sans-serif',
              marginBottom: '4px',
            }}
          >
            {champion.totalScore.toLocaleString()} points
          </p>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'system-ui, sans-serif',
              marginBottom: '32px',
            }}
          >
            {totalGames} game{totalGames !== 1 ? 's' : ''} played
          </p>
        </>
      ) : (
        <p
          style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontFamily: 'system-ui, sans-serif',
            marginBottom: '32px',
          }}
        >
          Calculating winner...
        </p>
      )}

      {/* Action buttons */}
      <div style={{ width: '100%', maxWidth: '320px' }}>
        {canShare && (
          <button
            data-testid="gn-share-button"
            onClick={handleShare}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '14px',
              border: '2px solid rgba(74, 222, 128, 0.4)',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #2d8a42 0%, #25733a 100%)',
              color: 'white',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: '0 4px 20px rgba(74, 222, 128, 0.3)',
              marginBottom: '12px',
            }}
          >
            SHARE RESULTS
          </button>
        )}

        <button
          data-testid="gn-return-lobby"
          onClick={() => {
            ;(dispatch as (name: string, ...args: unknown[]) => void)('gnSetChampionReady')
          }}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '14px',
            border: '2px solid rgba(212, 175, 55, 0.4)',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #8B6914 0%, #6B4F10 100%)',
            color: 'white',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.3)',
          }}
        >
          RETURN TO LOBBY
        </button>
      </div>
    </div>
  )
}
