import { useState, useCallback } from 'react'
import type { PokerPhase, PlayerAction, PokerGameState, Card } from '@weekend-casino/shared'
import { BETTING_PHASES } from '@weekend-casino/shared'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition.js'
import { useDispatchThunk, useSessionMember, useStateSync } from '../hooks/useVGFHooks.js'

/**
 * Main gameplay controller screen.
 *
 * Shows hole cards, action buttons during betting phases,
 * and a push-to-talk button for voice commands.
 */
export function ControllerGameplay({ phase }: { phase: PokerPhase }) {
  const isBettingPhase = (BETTING_PHASES as readonly string[]).includes(phase)
  const { status, pendingTranscript, finalTranscript, startRecording, stopRecording } = useVoiceRecognition()

  const dispatchThunk = useDispatchThunk() as (name: string, ...args: unknown[]) => void
  const member = useSessionMember()
  const state = useStateSync() as PokerGameState | null

  const playerId = member?.sessionMemberId ?? ''
  const player = state?.players.find(p => p.id === playerId)
  const isMyTurn = state ? state.players[state.activePlayerIndex]?.id === playerId : false
  const myStack = player?.stack ?? 0
  const currentBet = state?.currentBet ?? 0
  const myBet = player?.bet ?? 0
  const callAmount = currentBet - myBet
  const bigBlind = state?.blindLevel?.bigBlind ?? 20
  const minRaise = state?.minRaiseIncrement ?? bigBlind

  const myCards: [Card, Card] | undefined = playerId && state?.holeCards
    ? state.holeCards[playerId] as [Card, Card] | undefined
    : undefined

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
        <span>{phase}</span>
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '24px',
          flex: 1,
          alignItems: 'center',
        }}
      >
        {myCards ? (
          <>
            <div style={holeCardStyle}>
              <span style={{ fontSize: '28px', color: suitColour(myCards[0].suit) }}>
                {myCards[0].rank}
              </span>
              <span style={{ fontSize: '20px', color: suitColour(myCards[0].suit) }}>
                {suitSymbol(myCards[0].suit)}
              </span>
            </div>
            <div style={holeCardStyle}>
              <span style={{ fontSize: '28px', color: suitColour(myCards[1].suit) }}>
                {myCards[1].rank}
              </span>
              <span style={{ fontSize: '20px', color: suitColour(myCards[1].suit) }}>
                {suitSymbol(myCards[1].suit)}
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={holeCardStyle}>?</div>
            <div style={holeCardStyle}>?</div>
          </>
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
            <button style={actionButtonStyle('#e74c3c')} onClick={handleFold}>
              FOLD
            </button>
            {canCheck ? (
              <button style={actionButtonStyle('#3498db')} onClick={handleCheck}>
                CHECK
              </button>
            ) : canCall ? (
              <button style={actionButtonStyle('#3498db')} onClick={handleCall}>
                CALL ${callAmount}
              </button>
            ) : null}
            {canRaise && (
              <button style={actionButtonStyle('#f39c12')} onClick={handleRaise}>
                RAISE
              </button>
            )}
            <button style={actionButtonStyle('#e91e63')} onClick={handleAllIn}>
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

      {/* Push-to-talk */}
      <button
        style={{
          width: '100%',
          padding: '20px',
          fontSize: '18px',
          borderRadius: '12px',
          border: status === 'recording' ? '2px solid #e74c3c' : '2px solid #666',
          background: '#333',
          color: 'white',
          cursor: 'pointer',
          touchAction: 'none',
        }}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
      >
        {status === 'recording'
          ? pendingTranscript || 'Listening...'
          : status === 'processing'
            ? 'Processing...'
            : status === 'complete'
              ? finalTranscript || 'Hold to Talk'
              : 'Hold to Talk'}
      </button>
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
