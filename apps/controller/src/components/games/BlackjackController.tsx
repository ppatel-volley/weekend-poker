/**
 * Blackjack Classic controller — Bet placement, Hit/Stand/Double/Split/Surrender.
 *
 * Phase-driven layout:
 *   BJ_PLACE_BETS: Chip selector + confirm
 *   BJ_DEAL_INITIAL: Waiting for deal
 *   BJ_INSURANCE: Insurance prompt when dealer shows Ace
 *   BJ_PLAYER_TURNS: Action buttons (hit/stand/double/split/surrender)
 *   BJ_DEALER_TURN / BJ_SETTLEMENT / BJ_HAND_COMPLETE: Results display
 */

import { useState } from 'react'
import { usePhase, useStateSync, useDispatchThunk, useSessionMember } from '../../hooks/useVGFHooks.js'
import type { BlackjackGameState, Card } from '@weekend-casino/shared'

const BET_AMOUNTS = [10, 25, 50, 100, 250, 500]

/** Card display component. */
function CardDisplay({ card }: { card: Card }) {
  const suitSymbols: Record<string, string> = {
    spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C',
  }
  const suitColours: Record<string, string> = {
    spades: '#333', hearts: '#c0392b', diamonds: '#c0392b', clubs: '#333',
  }
  return (
    <div style={{
      width: '55px',
      height: '80px',
      background: 'white',
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: suitColours[card.suit] ?? '#333',
      fontSize: '18px',
      fontWeight: 'bold',
      border: '2px solid #ddd',
    }}>
      <div>{card.rank}</div>
      <div style={{ fontSize: '14px' }}>{suitSymbols[card.suit]}</div>
    </div>
  )
}

/** Hand value badge. */
function HandValueBadge({ value, isSoft, isBusted, isBlackjack }: {
  value: number
  isSoft: boolean
  isBusted: boolean
  isBlackjack: boolean
}) {
  const bg = isBlackjack ? '#f1c40f' : isBusted ? '#e74c3c' : value === 21 ? '#2ecc71' : '#555'
  const label = isBlackjack ? 'BLACKJACK' : isBusted ? 'BUST' : isSoft ? `Soft ${value}` : `${value}`
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      background: bg,
      fontWeight: 'bold',
      fontSize: '14px',
    }}>
      {label}
    </span>
  )
}

/** Bet placement screen. */
function BetPlacementView({
  bj,
  walletBalance,
  dispatchThunk,
  playerId,
}: {
  bj: BlackjackGameState
  walletBalance: number
  dispatchThunk: (name: string, ...args: unknown[]) => void
  playerId: string
}) {
  const [selectedBet, setSelectedBet] = useState(25)

  const myState = bj.playerStates.find(ps => ps.playerId === playerId)
  const hasPlacedBet = myState && myState.hands[0]!.bet > 0

  if (hasPlacedBet) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#aaa' }}>
        Bet placed: ${myState!.hands[0]!.bet}
        <br />Waiting for other players...
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ textAlign: 'center', fontSize: '14px', color: '#aaa' }}>
        Balance: ${walletBalance} | Round {bj.roundNumber}
      </div>

      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Select Bet</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {BET_AMOUNTS.filter(a => a <= bj.config.maxBet && a >= bj.config.minBet).map(amount => (
          <button
            key={amount}
            onClick={() => setSelectedBet(amount)}
            style={{
              padding: '14px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: selectedBet === amount ? '3px solid #f39c12' : '2px solid #555',
              background: selectedBet === amount ? '#f39c12' : '#2a2a3e',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            ${amount}
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
        Bet: ${selectedBet}
      </div>

      <button
        onClick={() => dispatchThunk('bjPlaceBet', playerId, selectedBet)}
        disabled={selectedBet > walletBalance}
        style={{
          padding: '18px',
          fontSize: '20px',
          fontWeight: 'bold',
          borderRadius: '10px',
          border: 'none',
          cursor: selectedBet <= walletBalance ? 'pointer' : 'not-allowed',
          background: selectedBet <= walletBalance ? '#f39c12' : '#555',
          color: 'white',
          marginTop: 'auto',
        }}
      >
        PLACE BET
      </button>
    </div>
  )
}

/** Insurance prompt. */
function InsuranceView({
  bj,
  playerId,
  dispatchThunk,
}: {
  bj: BlackjackGameState
  playerId: string
  dispatchThunk: (name: string, ...args: unknown[]) => void
}) {
  const myState = bj.playerStates.find(ps => ps.playerId === playerId)
  if (!myState) return null

  if (myState.insuranceResolved) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#aaa' }}>
        {myState.insuranceBet > 0 ? `Insurance: $${myState.insuranceBet}` : 'No insurance'}
        <br />Waiting...
      </div>
    )
  }

  const insuranceAmount = Math.floor(myState.hands[0]!.bet / 2)

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>INSURANCE?</div>
      <div style={{ textAlign: 'center', color: '#aaa' }}>
        Dealer shows an Ace. Take insurance for ${insuranceAmount}?
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
        <button
          onClick={() => dispatchThunk('bjProcessInsurance', playerId, true)}
          style={actionBtnStyle('#2ecc71')}
        >
          YES (${insuranceAmount})
        </button>
        <button
          onClick={() => dispatchThunk('bjProcessInsurance', playerId, false)}
          style={actionBtnStyle('#e74c3c')}
        >
          NO
        </button>
      </div>
    </div>
  )
}

/** Player actions (hit/stand/double/split/surrender). */
function PlayerActionsView({
  bj,
  playerId,
  dispatchThunk,
}: {
  bj: BlackjackGameState
  playerId: string
  dispatchThunk: (name: string, ...args: unknown[]) => void
}) {
  const myState = bj.playerStates.find(ps => ps.playerId === playerId)
  if (!myState) return null

  const currentTurnPlayerId = bj.turnOrder[bj.currentTurnIndex]
  const isMyTurn = currentTurnPlayerId === playerId

  const activeHand = myState.hands[myState.activeHandIndex]
  if (!activeHand) return null

  const allDone = activeHand.stood || activeHand.busted || myState.surrendered

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Hand display */}
      <div style={{ textAlign: 'center' }}>
        {myState.hands.length > 1 && (
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
            Hand {myState.activeHandIndex + 1} of {myState.hands.length}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
          {activeHand.cards.map((card, i) => (
            <CardDisplay key={i} card={card} />
          ))}
        </div>
        <HandValueBadge
          value={activeHand.value}
          isSoft={activeHand.isSoft}
          isBusted={activeHand.busted}
          isBlackjack={activeHand.isBlackjack}
        />
      </div>

      {/* Dealer's up card */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#aaa' }}>
        Dealer shows: {bj.dealerHand.cards[0] ? `${bj.dealerHand.cards[0].rank}` : '?'}
      </div>

      {/* Status messages */}
      {!isMyTurn && !allDone && (
        <div style={{ textAlign: 'center', padding: '16px', color: '#aaa' }}>
          Waiting for other players...
        </div>
      )}

      {allDone && (
        <div style={{ textAlign: 'center', padding: '16px', color: '#aaa' }}>
          {activeHand.busted ? 'BUST!' : activeHand.isBlackjack ? 'BLACKJACK!' : myState.surrendered ? 'SURRENDERED' : `Standing at ${activeHand.value}`}
        </div>
      )}

      {/* Action buttons */}
      {isMyTurn && !allDone && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
          <button
            onClick={() => dispatchThunk('bjHit', playerId)}
            style={actionBtnStyle('#2ecc71')}
          >
            HIT
          </button>
          <button
            onClick={() => dispatchThunk('bjStand', playerId)}
            style={actionBtnStyle('#e74c3c')}
          >
            STAND
          </button>
          {activeHand.cards.length === 2 && !activeHand.doubled && (
            <button
              onClick={() => dispatchThunk('bjDoubleDown', playerId)}
              style={actionBtnStyle('#f39c12')}
            >
              DOUBLE
            </button>
          )}
          {activeHand.cards.length === 2 && bj.config.splitEnabled && (
            <button
              onClick={() => dispatchThunk('bjSplit', playerId)}
              style={actionBtnStyle('#9b59b6')}
            >
              SPLIT
            </button>
          )}
          {activeHand.cards.length === 2 && bj.config.surrenderEnabled && (
            <button
              onClick={() => dispatchThunk('bjSurrender', playerId)}
              style={{
                ...actionBtnStyle('#95a5a6'),
                gridColumn: '1 / -1',
              }}
            >
              SURRENDER
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Results view. */
function ResultsView({
  bj,
  playerId,
}: {
  bj: BlackjackGameState
  playerId: string
}) {
  const myState = bj.playerStates.find(ps => ps.playerId === playerId)
  if (!myState) return null

  const isWin = myState.roundResult > 0
  const isPush = myState.roundResult === 0 && !myState.surrendered

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Dealer hand */}
      {bj.dealerHand.holeCardRevealed && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>DEALER</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {bj.dealerHand.cards.map((card, i) => (
              <CardDisplay key={i} card={card as Card} />
            ))}
          </div>
          <div style={{ marginTop: '4px' }}>
            <HandValueBadge
              value={bj.dealerHand.value}
              isSoft={bj.dealerHand.isSoft}
              isBusted={bj.dealerHand.busted}
              isBlackjack={bj.dealerHand.isBlackjack}
            />
          </div>
        </div>
      )}

      {/* Player hands */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>YOUR HAND{myState.hands.length > 1 ? 'S' : ''}</div>
        {myState.hands.map((hand, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            {myState.hands.length > 1 && (
              <div style={{ fontSize: '12px', color: '#aaa' }}>Hand {i + 1}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
              {hand.cards.map((card, j) => (
                <CardDisplay key={j} card={card} />
              ))}
            </div>
            <HandValueBadge
              value={hand.value}
              isSoft={hand.isSoft}
              isBusted={hand.busted}
              isBlackjack={hand.isBlackjack}
            />
          </div>
        ))}
      </div>

      {/* Result */}
      <div style={{
        textAlign: 'center',
        padding: '16px',
        borderRadius: '8px',
        background: isWin ? '#27ae60' : isPush ? '#f39c12' : '#c0392b',
        fontWeight: 'bold',
        fontSize: '20px',
      }}>
        {myState.surrendered ? 'SURRENDERED'
          : isWin ? `WON $${myState.roundResult}`
          : isPush ? 'PUSH'
          : `LOST $${Math.abs(myState.roundResult)}`
        }
      </div>

      {/* Insurance result */}
      {myState.insuranceBet > 0 && (
        <div style={{ textAlign: 'center', color: '#9b59b6' }}>
          Insurance bet: ${myState.insuranceBet}
        </div>
      )}
    </div>
  )
}

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '18px',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    background: bg,
    color: 'white',
  }
}

export function BlackjackController() {
  const phase = usePhase() as string | null
  const state = useStateSync()
  const dispatchThunk = useDispatchThunk()

  const member = useSessionMember()
  const bj = state?.blackjack
  const playerId = member?.sessionMemberId ?? ''
  const walletBalance = state?.wallet?.[playerId] ?? 0

  const phaseStr = phase ?? ''

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
      <h2 style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '16px' }}>Blackjack</h2>

      {!bj ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Waiting for round to start...
        </div>
      ) : phaseStr === 'BJ_PLACE_BETS' ? (
        <BetPlacementView
          bj={bj}
          walletBalance={walletBalance}
          dispatchThunk={dispatchThunk as any}
          playerId={playerId}
        />
      ) : phaseStr === 'BJ_DEAL_INITIAL' ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Dealing cards...
        </div>
      ) : phaseStr === 'BJ_INSURANCE' ? (
        <InsuranceView bj={bj} playerId={playerId} dispatchThunk={dispatchThunk as any} />
      ) : phaseStr === 'BJ_PLAYER_TURNS' ? (
        <PlayerActionsView bj={bj} playerId={playerId} dispatchThunk={dispatchThunk as any} />
      ) : (
        <ResultsView bj={bj} playerId={playerId} />
      )}
    </div>
  )
}
