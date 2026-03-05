import { useState, useCallback, useEffect, useRef } from 'react'
import type { PlayerAction, PokerGameState } from '@weekend-casino/shared'
import { CasinoPhase, BETTING_PHASES, getPhaseLabel } from '@weekend-casino/shared'
import { useDispatchThunk, useSessionMember, useStateSync } from '../hooks/useVGFHooks.js'
import { usePrivateHoleCards } from '../hooks/usePrivateHoleCards.js'
import { Hand3D } from './3d/Hand3D.js'

/**
 * Main gameplay controller screen.
 *
 * Shows hole cards, action buttons during betting phases,
 * and a push-to-talk button for voice commands.
 */
export function ControllerGameplay({ phase }: { phase: CasinoPhase }) {
  const isBettingPhase = (BETTING_PHASES as readonly string[]).includes(phase)

  const dispatchThunk = useDispatchThunk() as (name: string, ...args: unknown[]) => void
  const member = useSessionMember()
  // Hold'em-specific view: cast to PokerGameState for Hold'em field access
  const state = useStateSync() as unknown as PokerGameState | null

  const playerId = member?.sessionMemberId ?? ''
  const player = state?.players.find(p => p.id === playerId)
  const isMyTurn = state ? state.players[state.activePlayerIndex]?.id === playerId : false
  const myStack = player?.stack ?? 0
  const currentBet = state?.currentBet ?? 0
  const myBet = player?.bet ?? 0
  const callAmount = currentBet - myBet
  const bigBlind = state?.blindLevel?.bigBlind ?? 20
  const minRaise = state?.minRaiseIncrement ?? bigBlind

  // SECURITY: Hole cards are delivered via targeted private events,
  // never through broadcast state. state.holeCards is always {}.
  const myCards = usePrivateHoleCards(playerId)
  const requestedHandRef = useRef(0)
  useEffect(() => {
    const handNumber = (state as any)?.handNumber ?? 0
    if (phase === CasinoPhase.DealingHoleCards || phase === CasinoPhase.PreFlopBetting) {
      if (handNumber > 0 && requestedHandRef.current !== handNumber) {
        requestedHandRef.current = handNumber
        dispatchThunk('requestMyHoleCards')
      }
    }
  }, [phase, state, dispatchThunk])

  const [raiseAmount, setRaiseAmount] = useState(0)

  const dispatchAction = useCallback((action: PlayerAction, amount?: number) => {
    if (!playerId) return
    dispatchThunk('processPlayerAction', playerId, action, amount)
  }, [dispatchThunk, playerId])

  const handleFold = () => dispatchAction('fold')
  const handleCheck = () => dispatchAction('check')
  const handleCall = () => dispatchAction('call')
  const handleRaise = () => {
    const raiseTotal = currentBet + (raiseAmount > 0 ? raiseAmount : minRaise)
    dispatchAction('raise', raiseTotal)
  }
  const handleAllIn = () => dispatchAction('all_in')

  // Can we check? Only if no one has bet, or we've already matched the current bet
  const canCheck = currentBet === 0 || myBet >= currentBet
  const canCall = currentBet > myBet && callAmount < myStack
  const canRaise = myStack > callAmount + minRaise

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#1a1a2e',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '16px',
      }}
    >
      <h2 data-testid="game-heading" style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '16px' }}>Texas Hold&apos;em</h2>
      {/* Game info bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px',
          fontSize: '0.9rem',
          opacity: 0.8,
        }}
      >
        <span>{getPhaseLabel(phase)}</span>
        <span>Stack: ${myStack}</span>
      </div>

      {/* Turn indicator */}
      {isBettingPhase && (
        <div
          style={{
            textAlign: 'center',
            padding: '12px',
            marginBottom: '16px',
            borderRadius: 8,
            background: isMyTurn ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.05)',
            border: isMyTurn ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
            fontWeight: 600,
            fontSize: '1.1rem',
          }}
        >
          {isMyTurn ? 'Your turn!' : 'Waiting for opponent...'}
        </div>
      )}

      {/* Hole cards */}
      <div style={{ marginBottom: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {myCards ? (
          <Hand3D cards={[myCards[0], myCards[1]]} height={160} />
        ) : (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <div style={holeCardStyle}>?</div>
            <div style={holeCardStyle}>?</div>
          </div>
        )}
      </div>

      {/* Action buttons — only shown during betting phases when it's my turn */}
      {isBettingPhase && isMyTurn && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <button data-testid="fold-btn" style={actionButtonStyle('#e74c3c')} onClick={handleFold}>
              FOLD
            </button>
            {canCheck ? (
              <button data-testid="check-btn" style={actionButtonStyle('#3498db')} onClick={handleCheck}>
                CHECK
              </button>
            ) : canCall ? (
              <button data-testid="call-btn" style={actionButtonStyle('#3498db')} onClick={handleCall}>
                CALL ${callAmount}
              </button>
            ) : null}
            {canRaise && (
              <button data-testid="raise-btn" style={actionButtonStyle('#f39c12')} onClick={handleRaise}>
                RAISE TO ${currentBet + (raiseAmount > 0 ? raiseAmount : minRaise)}
              </button>
            )}
            <button data-testid="allin-btn" style={actionButtonStyle('#e91e63')} onClick={handleAllIn}>
              ALL IN ${myStack}
            </button>
          </div>

          {/* Raise slider */}
          {canRaise && (
            <div style={{ marginBottom: '16px', padding: '0 4px' }}>
              <input
                type="range"
                min={minRaise}
                max={myStack - callAmount}
                value={raiseAmount || minRaise}
                onChange={(e) => setRaiseAmount(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.6 }}>
                <span>Min: ${minRaise}</span>
                <span>Raise: ${raiseAmount || minRaise}</span>
                <span>Max: ${myStack - callAmount}</span>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  )
}

function suitSymbol(suit: string): string {
  switch (suit) {
    case 'spades': return '\u2660'
    case 'hearts': return '\u2665'
    case 'diamonds': return '\u2666'
    case 'clubs': return '\u2663'
    default: return ''
  }
}

function suitColour(suit: string): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#e74c3c' : '#ecf0f1'
}

const holeCardStyle: React.CSSProperties = {
  width: '80px',
  height: '120px',
  borderRadius: '8px',
  background: '#fafafa',
  border: '2px solid #888',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
}

function actionButtonStyle(bg: string): React.CSSProperties {
  return {
    padding: '16px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    background: bg,
    color: 'white',
  }
}
