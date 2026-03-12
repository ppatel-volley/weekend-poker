/**
 * Blackjack Competitive controller — Ante, Hit/Stand/Double (no split/surrender).
 *
 * Phase-driven layout:
 *   BJC_PLACE_BETS: Auto-ante display (no player input needed)
 *   BJC_DEAL_INITIAL: Waiting for deal
 *   BJC_PLAYER_TURNS: Action buttons (hit/stand/double only — no split per D-007)
 *   BJC_SHOWDOWN / BJC_SETTLEMENT / BJC_HAND_COMPLETE: Results display
 *
 * Turn indicator: "Your turn!" / "Waiting for [player]..."
 * Opponent hand values visible after they stand.
 */

import { usePhase, useStateSync, useDispatchThunk, useSessionMember } from '../../hooks/useVGFHooks.js'
import { CardHand2D } from '../shared/CardDisplay2D.js'
import type { CasinoGameState, BlackjackCompetitiveGameState, BjcPlayerState } from '@weekend-casino/shared'


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

/** Ante posted waiting view. */
function AnteView({
  bjc,
  playerId,
}: {
  bjc: BlackjackCompetitiveGameState
  playerId: string
}) {
  const myState = bjc.playerStates.find(ps => ps.playerId === playerId)
  const ante = myState?.hand.bet ?? bjc.anteAmount

  return (
    <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '16px', marginBottom: '12px' }}>Ante: ${ante}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>
        Pot: ${bjc.pot}
      </div>
      <div style={{ fontSize: '14px', marginTop: '8px' }}>
        {bjc.playerStates.length} players in the arena
      </div>
    </div>
  )
}

/** Opponent summary during player turns. */
function OpponentSummary({
  opponent,
  players,
}: {
  opponent: BjcPlayerState
  players: Array<{ id: string; name?: string }>
}) {
  const hand = opponent.hand

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      background: hand.busted ? '#2a1a1a' : hand.stood ? '#1a2a1a' : '#1a1a2a',
      borderRadius: '6px',
    }}>
      <div style={{ flex: 1, fontSize: '13px' }}>
        {players.find(p => p.id === opponent.playerId)?.name ?? opponent.playerId.slice(0, 8)}
      </div>
      <div>
        {hand.busted ? (
          <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>BUST ({hand.value})</span>
        ) : hand.stood ? (
          <HandValueBadge value={hand.value} isSoft={hand.isSoft} isBusted={false} isBlackjack={hand.isBlackjack} />
        ) : (
          <span style={{ color: '#aaa' }}>{hand.cards.length} cards</span>
        )}
      </div>
    </div>
  )
}

/** Player actions (hit/stand/double only — no split per D-007). */
function PlayerActionsView({
  bjc,
  playerId,
  dispatchThunk,
  players,
}: {
  bjc: BlackjackCompetitiveGameState
  playerId: string
  dispatchThunk: (name: string, ...args: unknown[]) => void
  players: CasinoGameState['players']
}) {
  const myState = bjc.playerStates.find(ps => ps.playerId === playerId)
  if (!myState) return null

  const currentTurnPlayerId = bjc.turnOrder[bjc.currentTurnIndex]
  const isMyTurn = currentTurnPlayerId === playerId
  const hand = myState.hand
  const allDone = hand.stood || hand.busted

  // Find current turn player name
  const currentPlayer = players.find(p => p.id === currentTurnPlayerId)
  const currentPlayerName = currentPlayer?.name ?? currentTurnPlayerId?.slice(0, 8)

  // Opponents
  const opponents = bjc.playerStates.filter(ps => ps.playerId !== playerId)

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Pot */}
      <div style={{ textAlign: 'center', fontSize: '14px', color: '#f39c12', fontWeight: 'bold' }}>
        Pot: ${bjc.pot}
      </div>

      {/* My hand */}
      <div style={{ textAlign: 'center' }}>
        <CardHand2D cards={hand.cards} />
        <HandValueBadge
          value={hand.value}
          isSoft={hand.isSoft}
          isBusted={hand.busted}
          isBlackjack={hand.isBlackjack}
        />
      </div>

      {/* Opponents */}
      {opponents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {opponents.map(opp => (
            <OpponentSummary key={opp.playerId} opponent={opp} players={players} />
          ))}
        </div>
      )}

      {/* Turn status */}
      {!isMyTurn && !allDone && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#aaa', fontSize: '16px' }}>
          Waiting for {currentPlayerName}...
        </div>
      )}

      {isMyTurn && !allDone && (
        <div style={{ textAlign: 'center', padding: '8px', color: '#f1c40f', fontWeight: 'bold', fontSize: '18px' }}>
          Your turn!
        </div>
      )}

      {allDone && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#aaa' }}>
          {hand.busted ? 'BUST!' : hand.isBlackjack ? 'BLACKJACK!' : `Standing at ${hand.value}`}
        </div>
      )}

      {/* Action buttons — hit/stand/double only (NO split, NO surrender per D-007/PRD 19) */}
      {isMyTurn && !allDone && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
          <button
            data-testid="hit-btn"
            onClick={() => dispatchThunk('bjcHit', playerId)}
            style={actionBtnStyle('#2ecc71')}
          >
            HIT
          </button>
          <button
            data-testid="stand-btn"
            onClick={() => dispatchThunk('bjcStand', playerId)}
            style={actionBtnStyle('#e74c3c')}
          >
            STAND
          </button>
          {hand.cards.length === 2 && !hand.doubled && (
            <button
              data-testid="double-btn"
              onClick={() => dispatchThunk('bjcDoubleDown', playerId)}
              style={{
                ...actionBtnStyle('#f39c12'),
                gridColumn: '1 / -1',
              }}
            >
              DOUBLE DOWN
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Results view — showdown and settlement with Next Round button. */
function ResultsView({
  bjc,
  playerId,
  players,
  dispatchThunk,
  phase,
}: {
  bjc: BlackjackCompetitiveGameState
  playerId: string
  players: CasinoGameState['players']
  dispatchThunk: (name: string, ...args: unknown[]) => void
  phase: string
}) {
  const myState = bjc.playerStates.find(ps => ps.playerId === playerId)
  if (!myState) return null

  const isWinner = bjc.winnerIds.includes(playerId)
  const winnerCount = bjc.winnerIds.length
  const potShare = winnerCount > 0 ? Math.floor(bjc.pot / winnerCount) : 0

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* All hands */}
      <div style={{ fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>ALL HANDS</div>
      {bjc.playerStates.map(ps => {
        const player = players.find(p => p.id === ps.playerId)
        const name = player?.name ?? ps.playerId.slice(0, 8)
        const isThisWinner = bjc.winnerIds.includes(ps.playerId)
        return (
          <div
            key={ps.playerId}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: isThisWinner ? '#1a3a1a' : '#1a1a2a',
              border: isThisWinner ? '2px solid #2ecc71' : '1px solid #333',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: 'bold' }}>
                {name}{ps.playerId === playerId ? ' (You)' : ''}
              </span>
              <HandValueBadge
                value={ps.hand.value}
                isSoft={ps.hand.isSoft}
                isBusted={ps.hand.busted}
                isBlackjack={ps.hand.isBlackjack}
              />
            </div>
            <CardHand2D cards={ps.hand.cards} />
            {isThisWinner && (
              <div style={{ marginTop: '4px', color: '#2ecc71', fontWeight: 'bold' }}>
                WINNER
              </div>
            )}
          </div>
        )
      })}

      {/* Result */}
      <div style={{
        textAlign: 'center',
        padding: '16px',
        borderRadius: '8px',
        background: isWinner ? '#27ae60' : '#c0392b',
        fontWeight: 'bold',
        fontSize: '20px',
      }}>
        {isWinner
          ? `WON $${potShare}!`
          : `LOST $${myState.hand.bet}`
        }
      </div>

      {/* Result message from dealer */}
      {bjc.resultMessage && (
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
          {bjc.resultMessage}
        </div>
      )}

      {/* Spacer pushes button to bottom */}
      <div style={{ flex: 1 }} />

      {/* Next Round button — visible during BJC_HAND_COMPLETE until player taps */}
      {phase === 'BJC_HAND_COMPLETE' && !bjc.roundCompleteReady && (
        <button
          data-testid="next-round-btn"
          onClick={() => dispatchThunk('bjcReadyNextRound')}
          style={{
            padding: '20px',
            fontSize: '22px',
            fontWeight: 'bold',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            background: '#3498db',
            color: 'white',
          }}
        >
          NEXT ROUND
        </button>
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

export function CompetitiveBlackjackController() {
  const phase = usePhase() as string | null
  const state = useStateSync()
  const dispatchThunk = useDispatchThunk()

  const member = useSessionMember()
  const bjc = state?.blackjackCompetitive
  const players = state?.players ?? []
  const playerId = member?.sessionMemberId ?? ''

  const phaseStr = phase ?? ''

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#1a0a2a',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
      }}
    >
      <h2 data-testid="game-heading" style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '16px' }}>
        Blackjack Arena
      </h2>

      {!bjc ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Waiting for round to start...
        </div>
      ) : phaseStr === 'BJC_PLACE_BETS' ? (
        <AnteView bjc={bjc} playerId={playerId} />
      ) : phaseStr === 'BJC_DEAL_INITIAL' ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Dealing cards...
        </div>
      ) : phaseStr === 'BJC_PLAYER_TURNS' ? (
        <PlayerActionsView
          bjc={bjc}
          playerId={playerId}
          dispatchThunk={dispatchThunk as any}
          players={players}
        />
      ) : (
        <ResultsView bjc={bjc} playerId={playerId} players={players} dispatchThunk={dispatchThunk as any} phase={phaseStr} />
      )}
    </div>
  )
}
