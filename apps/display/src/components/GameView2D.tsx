import { useStateSync } from '../hooks/useVGFHooks.js'
import type { PokerGameState, PokerPlayer } from '@weekend-poker/shared'

function PlayerCard({ player, isActive }: { player: PokerPlayer; isActive: boolean }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        background: isActive ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.05)',
        border: isActive ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <span style={{ fontWeight: 600 }}>{player.name || player.id.slice(0, 8)}</span>
        <span style={{ opacity: 0.5, marginLeft: 8, fontSize: '0.8rem' }}>
          {player.status === 'folded' ? 'FOLDED' : player.status === 'all_in' ? 'ALL IN' : ''}
        </span>
        {player.lastAction && (
          <span style={{ marginLeft: 8, color: '#fbbf24', fontSize: '0.8rem' }}>
            {player.lastAction}
          </span>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>${player.stack}</div>
        {player.bet > 0 && (
          <div style={{ fontSize: '0.8rem', color: '#fbbf24' }}>Bet: ${player.bet}</div>
        )}
      </div>
    </div>
  )
}

export function GameView2D() {
  const state = useStateSync() as PokerGameState | null
  if (!state) return <div style={{ color: 'white', padding: 40 }}>Loading state...</div>

  const { phase, players, communityCards, pot, currentBet, handNumber, dealerIndex, activePlayerIndex, dealerMessage, sidePots } = state

  return (
    <div
      style={{
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at center, #1a3a1a 0%, #0a0a0a 80%)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Weekend Poker</h1>
        <div style={{ textAlign: 'right', opacity: 0.7, fontSize: '0.9rem' }}>
          <div>Phase: <strong>{phase}</strong></div>
          <div>Hand #{handNumber}</div>
        </div>
      </div>

      {/* Dealer message */}
      {dealerMessage && (
        <div
          style={{
            textAlign: 'center',
            padding: '12px',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: 8,
            marginBottom: '1.5rem',
            color: '#fbbf24',
          }}
        >
          {dealerMessage}
        </div>
      )}

      {/* Community cards + pot */}
      <div
        style={{
          textAlign: 'center',
          padding: '1.5rem',
          background: 'rgba(0,100,0,0.2)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 8 }}>COMMUNITY CARDS</div>
        <div style={{ fontSize: '2rem', letterSpacing: '0.5rem', marginBottom: '1rem', minHeight: '2.5rem' }}>
          {communityCards.length > 0
            ? communityCards.map((c, i) => (
                <span key={i} style={{ color: c.suit === 'hearts' || c.suit === 'diamonds' ? '#ef4444' : 'white' }}>
                  {c.rank}{c.suit === 'hearts' ? '\u2665' : c.suit === 'diamonds' ? '\u2666' : c.suit === 'clubs' ? '\u2663' : '\u2660'}
                </span>
              ))
            : <span style={{ opacity: 0.3 }}>--</span>
          }
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          Pot: ${pot}
          {sidePots.length > 0 && (
            <span style={{ fontSize: '0.8rem', opacity: 0.6, marginLeft: 8 }}>
              ({sidePots.length} side pot{sidePots.length > 1 ? 's' : ''})
            </span>
          )}
        </div>
        {currentBet > 0 && (
          <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: 4 }}>
            Current bet: ${currentBet}
          </div>
        )}
      </div>

      {/* Players */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {players.map((player, idx) => (
          <div key={player.id} style={{ position: 'relative' }}>
            {idx === dealerIndex && (
              <span style={{ position: 'absolute', left: -24, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem' }}>D</span>
            )}
            <PlayerCard player={player} isActive={idx === activePlayerIndex} />
          </div>
        ))}
      </div>
    </div>
  )
}
