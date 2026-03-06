/**
 * 5-Card Draw controller — card selection for discard + betting controls.
 *
 * Phase-driven layout:
 *   DRAW_POSTING_BLINDS / DRAW_DEALING: Waiting for deal
 *   DRAW_BETTING_1 / DRAW_BETTING_2: Betting actions (fold/check/call/raise/all-in)
 *   DRAW_DRAW_PHASE: Card discard selection + confirm
 *   DRAW_SHOWDOWN / DRAW_POT_DISTRIBUTION / DRAW_HAND_COMPLETE: Results display
 */

import { useState, useCallback } from 'react'
import { usePhase, useStateSync, useDispatchThunk, useSessionMember } from '../../hooks/useVGFHooks.js'
import { CardHand2D } from '../shared/CardDisplay2D.js'
import type { FiveCardDrawGameState, Card } from '@weekend-casino/shared'


/** Betting view for DRAW_BETTING_1 and DRAW_BETTING_2 phases. */
function BettingView({
  draw,
  playerId,
  players,
  dispatchThunk,
}: {
  draw: FiveCardDrawGameState
  playerId: string
  players: Array<{ id: string; status: string; stack: number; bet: number }>
  dispatchThunk: (name: string, ...args: unknown[]) => void
}) {
  const player = players.find(p => p.id === playerId)
  if (!player) return null

  const isMyTurn = players[draw.activePlayerIndex]?.id === playerId
  const hand = draw.hands[playerId] ?? []

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Hand display */}
      {hand.length > 0 ? (
        <CardHand2D cards={hand} />
      ) : (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '16px' }}>Waiting for cards...</div>
      )}

      {/* Pot and bet info */}
      <div style={{ textAlign: 'center', fontSize: '13px', color: '#aaa' }}>
        Pot: ${draw.pot} | Current bet: ${draw.currentBet} | Your bet: ${player.bet} | Stack: ${player.stack}
      </div>

      {/* Turn indicator */}
      {!isMyTurn && (
        <div style={{ textAlign: 'center', padding: '16px', color: '#aaa' }}>
          Waiting for other players...
        </div>
      )}

      {/* Action buttons */}
      {isMyTurn && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
          <button
            data-testid="fold-btn"
            onClick={() => dispatchThunk('drawProcessAction', playerId, 'fold')}
            style={actionBtnStyle('#e74c3c')}
          >
            FOLD
          </button>
          {player.bet >= draw.currentBet ? (
            <button
              data-testid="check-btn"
              onClick={() => dispatchThunk('drawProcessAction', playerId, 'check')}
              style={actionBtnStyle('#2ecc71')}
            >
              CHECK
            </button>
          ) : (
            <button
              data-testid="call-btn"
              onClick={() => dispatchThunk('drawProcessAction', playerId, 'call')}
              style={actionBtnStyle('#f39c12')}
            >
              CALL ${draw.currentBet}
            </button>
          )}
          <button
            data-testid="raise-btn"
            onClick={() => dispatchThunk('drawProcessAction', playerId, 'raise', draw.currentBet + draw.minRaiseIncrement)}
            disabled={player.stack <= draw.currentBet - player.bet}
            style={actionBtnStyle('#9b59b6', player.stack <= draw.currentBet - player.bet)}
          >
            RAISE
          </button>
          <button
            data-testid="allin-btn"
            onClick={() => dispatchThunk('drawProcessAction', playerId, 'all_in')}
            style={actionBtnStyle('#e91e63')}
          >
            ALL IN
          </button>
        </div>
      )}
    </div>
  )
}

/** Discard selection view for DRAW_DRAW_PHASE. */
function DiscardView({
  draw,
  playerId,
  dispatchThunk,
}: {
  draw: FiveCardDrawGameState
  playerId: string
  dispatchThunk: (name: string, ...args: unknown[]) => void
}) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const hand = draw.hands[playerId] ?? []
  const hasConfirmed = draw.confirmedDiscards[playerId] === true

  const toggleCard = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  if (hasConfirmed) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#aaa' }}>
        Discard confirmed. Waiting for other players...
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ textAlign: 'center', color: '#aaa', fontSize: '14px' }}>
        Tap cards to select for discard
      </p>

      {/* Card hand */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flex: 1, alignItems: 'center' }}>
        {hand.map((card, i) => {
          const isSelected = selectedIndices.has(i)
          return (
            <button
              key={i}
              onClick={() => toggleCard(i)}
              aria-label={`Card ${i + 1}${isSelected ? ' (selected for discard)' : ''}`}
              style={{
                width: '56px',
                height: '84px',
                borderRadius: '6px',
                background: isSelected ? '#3a1a1e' : 'white',
                border: isSelected ? '2px solid #e74c3c' : '2px solid #ddd',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                color: isSelected ? '#e74c3c' : '#333',
                cursor: 'pointer',
                transform: isSelected ? 'translateY(-8px)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isSelected ? 'X' : (
                <>
                  <div>{card.rank}</div>
                  <div style={{ fontSize: '14px' }}>
                    {{ spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' }[card.suit]}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Selection info */}
      <p style={{ textAlign: 'center', color: '#888', fontSize: '13px' }}>
        {selectedIndices.size === 0
          ? 'No cards selected'
          : `${selectedIndices.size} card${selectedIndices.size > 1 ? 's' : ''} selected for discard`}
      </p>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button
          data-testid="draw-btn"
          onClick={() => dispatchThunk('drawProcessDiscard', playerId, [...selectedIndices])}
          disabled={selectedIndices.size === 0}
          style={actionBtnStyle('#3498db', selectedIndices.size === 0)}
        >
          DRAW ({selectedIndices.size})
        </button>
        <button
          data-testid="keep-all-btn"
          onClick={() => dispatchThunk('drawProcessDiscard', playerId, [])}
          style={actionBtnStyle('#2ecc71')}
        >
          KEEP ALL CARDS
        </button>
      </div>
    </div>
  )
}

/** Results view for showdown/pot distribution/hand complete. */
function ResultsView({ draw, playerId }: { draw: FiveCardDrawGameState; playerId: string }) {
  const hand = draw.hands[playerId] ?? []

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>YOUR HAND</div>
        <CardHand2D cards={hand} />
      </div>

      <div style={{ textAlign: 'center', padding: '16px', color: '#aaa', fontSize: '14px' }}>
        {draw.pot > 0 ? `Pot: $${draw.pot}` : 'Hand complete'}
      </div>
    </div>
  )
}

function actionBtnStyle(bg: string, disabled?: boolean): React.CSSProperties {
  return {
    padding: '14px',
    fontSize: '15px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#555' : bg,
    color: 'white',
    opacity: disabled ? 0.5 : 1,
  }
}

export function FiveCardDrawController() {
  const phase = usePhase() as string | null
  const state = useStateSync()
  const dispatchThunk = useDispatchThunk()
  const member = useSessionMember()

  const draw = state?.fiveCardDraw as FiveCardDrawGameState | undefined
  const playerId = member?.sessionMemberId ?? ''
  const players = (state?.players ?? []) as Array<{ id: string; status: string; stack: number; bet: number }>

  const phaseStr = phase ?? ''
  const isBetting = phaseStr === 'DRAW_BETTING_1' || phaseStr === 'DRAW_BETTING_2'
  const isDiscard = phaseStr === 'DRAW_DRAW_PHASE'
  const isResults = phaseStr === 'DRAW_SHOWDOWN' || phaseStr === 'DRAW_POT_DISTRIBUTION' || phaseStr === 'DRAW_HAND_COMPLETE'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#1a1a2e',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2 data-testid="game-heading" style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '16px' }}>5-Card Draw</h2>

      {phaseStr === 'DRAW_POSTING_BLINDS' || phaseStr === 'DRAW_DEALING' ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {phaseStr === 'DRAW_POSTING_BLINDS' ? 'Posting blinds...' : 'Dealing cards...'}
        </div>
      ) : !draw ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Waiting for hand to start...
        </div>
      ) : isBetting ? (
        <BettingView
          draw={draw}
          playerId={playerId}
          players={players}
          dispatchThunk={dispatchThunk as any}
        />
      ) : isDiscard ? (
        <DiscardView draw={draw} playerId={playerId} dispatchThunk={dispatchThunk as any} />
      ) : isResults ? (
        <ResultsView draw={draw} playerId={playerId} />
      ) : (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Waiting...
        </div>
      )}
    </div>
  )
}
