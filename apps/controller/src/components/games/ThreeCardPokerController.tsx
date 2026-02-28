/**
 * Three Card Poker controller — Ante, Pair Plus, Play/Fold UI.
 *
 * Phase-driven layout:
 *   TCP_PLACE_BETS: Ante slider + Pair Plus toggle + confirm
 *   TCP_DEAL_CARDS: Waiting for deal
 *   TCP_PLAYER_DECISIONS: Show 3 cards + Play/Fold buttons
 *   TCP_DEALER_REVEAL/TCP_SETTLEMENT/TCP_ROUND_COMPLETE: Results display
 */

import { useState } from 'react'
import { usePhase, useStateSync, useDispatchThunk } from '../../hooks/useVGFHooks.js'
import type { CasinoGameState, ThreeCardPokerGameState, Card } from '@weekend-casino/shared'

const ANTE_AMOUNTS = [10, 25, 50, 100, 250, 500]

/** Card display component — shows rank and suit. */
function CardDisplay({ card }: { card: Card }) {
  const suitSymbols: Record<string, string> = {
    spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C',
  }
  const suitColours: Record<string, string> = {
    spades: '#333', hearts: '#c0392b', diamonds: '#c0392b', clubs: '#333',
  }
  return (
    <div style={{
      width: '70px',
      height: '100px',
      background: 'white',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: suitColours[card.suit] ?? '#333',
      fontSize: '20px',
      fontWeight: 'bold',
      border: '2px solid #ddd',
    }}>
      <div>{card.rank}</div>
      <div style={{ fontSize: '16px' }}>{suitSymbols[card.suit]}</div>
    </div>
  )
}

/** Ante betting screen. */
function AnteBettingView({
  tcp,
  walletBalance,
  dispatchThunk,
  playerId,
}: {
  tcp: ThreeCardPokerGameState
  walletBalance: number
  dispatchThunk: (name: string, ...args: unknown[]) => void
  playerId: string
}) {
  const [selectedAnte, setSelectedAnte] = useState(25)
  const [pairPlusEnabled, setPairPlusEnabled] = useState(false)
  const [pairPlusAmount, setPairPlusAmount] = useState(25)

  const myHand = tcp.playerHands.find(h => h.playerId === playerId)
  const hasPlacedAnte = myHand && myHand.anteBet > 0

  const totalBet = selectedAnte + (pairPlusEnabled ? pairPlusAmount : 0)
  const canAfford = totalBet <= walletBalance

  const handleConfirm = () => {
    if (!canAfford) return
    dispatchThunk(
      'tcpPlaceAnteBet',
      playerId,
      selectedAnte,
      pairPlusEnabled ? pairPlusAmount : 0,
    )
  }

  if (hasPlacedAnte) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#aaa' }}>
        Ante placed: ${myHand.anteBet}
        {myHand.pairPlusBet > 0 && ` + Pair Plus: $${myHand.pairPlusBet}`}
        <br />Waiting for other players...
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ textAlign: 'center', fontSize: '14px', color: '#aaa' }}>
        Balance: ${walletBalance} | Round {tcp.roundNumber}
      </div>

      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Select Ante</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {ANTE_AMOUNTS.filter(a => a <= tcp.config.maxAnte && a >= tcp.config.minAnte).map(amount => (
          <button
            key={amount}
            onClick={() => setSelectedAnte(amount)}
            style={{
              padding: '14px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: selectedAnte === amount ? '3px solid #f39c12' : '2px solid #555',
              background: selectedAnte === amount ? '#f39c12' : '#2a2a3e',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            ${amount}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={pairPlusEnabled}
            onChange={e => setPairPlusEnabled(e.target.checked)}
          />
          Pair Plus: ${pairPlusAmount}
        </label>
        {pairPlusEnabled && (
          <select
            value={pairPlusAmount}
            onChange={e => setPairPlusAmount(Number(e.target.value))}
            style={{ background: '#2a2a3e', color: 'white', border: '1px solid #555', padding: '4px', borderRadius: '4px' }}
          >
            {[10, 25, 50, 100].filter(a => a <= tcp.config.maxPairPlus).map(a => (
              <option key={a} value={a}>${a}</option>
            ))}
          </select>
        )}
      </div>

      <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
        Total: ${totalBet}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!canAfford}
        style={{
          padding: '18px',
          fontSize: '20px',
          fontWeight: 'bold',
          borderRadius: '10px',
          border: 'none',
          cursor: canAfford ? 'pointer' : 'not-allowed',
          background: canAfford ? '#f39c12' : '#555',
          color: 'white',
          marginTop: 'auto',
        }}
      >
        CONFIRM ANTE
      </button>
    </div>
  )
}

/** Decision screen — show cards, Play or Fold. */
function DecisionView({
  tcp,
  playerId,
  dispatchThunk,
}: {
  tcp: ThreeCardPokerGameState
  playerId: string
  dispatchThunk: (name: string, ...args: unknown[]) => void
}) {
  const myHand = tcp.playerHands.find(h => h.playerId === playerId)
  if (!myHand) return null

  if (myHand.decision !== 'undecided') {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: '#aaa' }}>
        You chose to {myHand.decision.toUpperCase()}.
        <br />Waiting for other players...
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>YOUR HAND</div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
        {myHand.cards.map((card, i) => (
          <CardDisplay key={i} card={card} />
        ))}
      </div>

      <div style={{ textAlign: 'center', color: '#aaa' }}>
        Ante: ${myHand.anteBet}
        {myHand.pairPlusBet > 0 && ` | Pair Plus: $${myHand.pairPlusBet}`}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
        <button
          onClick={() => dispatchThunk('tcpMakeDecision', playerId, 'play')}
          style={{
            padding: '22px',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            background: '#2ecc71',
            color: 'white',
          }}
        >
          PLAY ${myHand.anteBet}
        </button>
        <button
          onClick={() => dispatchThunk('tcpMakeDecision', playerId, 'fold')}
          style={{
            padding: '22px',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            background: '#e74c3c',
            color: 'white',
          }}
        >
          FOLD
        </button>
      </div>
    </div>
  )
}

/** Results view — shows dealer hand, qualification, and payout. */
function ResultsView({
  tcp,
  playerId,
}: {
  tcp: ThreeCardPokerGameState
  playerId: string
}) {
  const myHand = tcp.playerHands.find(h => h.playerId === playerId)
  if (!myHand) return null

  const isWin = myHand.roundResult > 0
  const isTie = myHand.roundResult === 0 && myHand.decision !== 'fold'

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Dealer hand */}
      {tcp.dealerRevealed && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>DEALER</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {tcp.dealerHand.cards.map((card, i) => (
              <CardDisplay key={i} card={card as Card} />
            ))}
          </div>
          <div style={{
            marginTop: '8px',
            padding: '8px',
            borderRadius: '6px',
            background: tcp.dealerQualifies ? '#27ae60' : '#c0392b',
            fontWeight: 'bold',
          }}>
            {tcp.dealerQualifies ? 'DEALER QUALIFIES' : 'DEALER DOES NOT QUALIFY'}
          </div>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
            Dealer needs Queen-high or better to qualify
          </p>
        </div>
      )}

      {/* Player hand */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>YOUR HAND</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
          {myHand.cards.map((card, i) => (
            <CardDisplay key={i} card={card} />
          ))}
        </div>
      </div>

      {/* Result */}
      <div style={{
        textAlign: 'center',
        padding: '16px',
        borderRadius: '8px',
        background: isWin ? '#27ae60' : isTie ? '#f39c12' : '#c0392b',
        fontWeight: 'bold',
        fontSize: '20px',
      }}>
        {myHand.decision === 'fold' ? 'FOLDED' : isWin ? `WON $${myHand.roundResult}` : isTie ? 'PUSH' : `LOST $${Math.abs(myHand.roundResult)}`}
      </div>

      {/* Payout breakdown */}
      {myHand.anteBonus > 0 && (
        <div style={{ textAlign: 'center', color: '#f1c40f' }}>
          Ante Bonus: +${myHand.anteBonus}
        </div>
      )}
      {myHand.pairPlusPayout > 0 && (
        <div style={{ textAlign: 'center', color: '#9b59b6' }}>
          Pair Plus: +${myHand.pairPlusPayout}
        </div>
      )}
    </div>
  )
}

export function ThreeCardPokerController() {
  const phase = usePhase() as string | null
  const state = useStateSync() as CasinoGameState | null
  const dispatchThunk = useDispatchThunk()

  const tcp = state?.threeCardPoker
  // Use first player as placeholder until we have proper client ID
  const players = state?.players ?? []
  const playerId = players[0]?.id ?? ''
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
      <h2 style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '16px' }}>Three Card Poker</h2>

      {!tcp ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Waiting for round to start...
        </div>
      ) : phaseStr === 'TCP_PLACE_BETS' ? (
        <AnteBettingView
          tcp={tcp}
          walletBalance={walletBalance}
          dispatchThunk={dispatchThunk as any}
          playerId={playerId}
        />
      ) : phaseStr === 'TCP_DEAL_CARDS' ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Dealing cards...
        </div>
      ) : phaseStr === 'TCP_PLAYER_DECISIONS' ? (
        <DecisionView tcp={tcp} playerId={playerId} dispatchThunk={dispatchThunk as any} />
      ) : (
        <ResultsView tcp={tcp} playerId={playerId} />
      )}
    </div>
  )
}
