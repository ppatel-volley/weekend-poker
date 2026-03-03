/**
 * Roulette controller — Two-tab betting layout (Decision 7/RC-2).
 *
 * Tab 1 "Quick Bets" (default): Red/Black, Odd/Even, High/Low, Dozens,
 *   Columns, favourite numbers, Repeat Last.
 * Tab 2 "Number Grid": Full 0-36 number grid with context menus.
 *
 * Phase-driven layout:
 *   ROULETTE_PLACE_BETS: Betting UI with two tabs
 *   ROULETTE_NO_MORE_BETS: "No more bets" display
 *   ROULETTE_SPIN: Spinning indicator
 *   ROULETTE_RESULT/ROULETTE_PAYOUT/ROULETTE_ROUND_COMPLETE: Results
 */

import { useState } from 'react'
import { usePhase, useStateSync, useDispatchThunk, useSessionMember } from '../../hooks/useVGFHooks.js'
import type { RouletteGameState, RouletteBetType } from '@weekend-casino/shared'

const CHIP_VALUES = [5, 10, 25, 50, 100]

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

function getColour(n: number): string {
  if (n === 0) return '#27ae60'
  return RED_NUMBERS.has(n) ? '#e74c3c' : '#2c3e50'
}

/** Quick bets tab — outside bets, favourites, repeat last. */
function QuickBetsTab({
  roulette,
  chipValue,
  dispatchThunk,
  playerId,
}: {
  roulette: RouletteGameState
  chipValue: number
  dispatchThunk: (name: string, ...args: unknown[]) => void
  playerId: string
}) {
  const placeBet = (type: RouletteBetType) => {
    dispatchThunk('roulettePlaceBet', playerId, type, chipValue)
  }

  const btnStyle = (bg: string) => ({
    padding: '14px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    background: bg,
    color: 'white',
    minHeight: '48px',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
      {/* Red / Black */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button onClick={() => placeBet('red')} style={btnStyle('#e74c3c')}>RED</button>
        <button onClick={() => placeBet('black')} style={btnStyle('#2c3e50')}>BLACK</button>
      </div>

      {/* Odd / Even */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button onClick={() => placeBet('odd')} style={btnStyle('#8e44ad')}>ODD</button>
        <button onClick={() => placeBet('even')} style={btnStyle('#8e44ad')}>EVEN</button>
      </div>

      {/* Low / High */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button onClick={() => placeBet('low')} style={btnStyle('#2980b9')}>1-18 LOW</button>
        <button onClick={() => placeBet('high')} style={btnStyle('#2980b9')}>19-36 HIGH</button>
      </div>

      {/* Dozens */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <button onClick={() => placeBet('dozen_1')} style={btnStyle('#16a085')}>1st 12</button>
        <button onClick={() => placeBet('dozen_2')} style={btnStyle('#16a085')}>2nd 12</button>
        <button onClick={() => placeBet('dozen_3')} style={btnStyle('#16a085')}>3rd 12</button>
      </div>

      {/* Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <button onClick={() => placeBet('column_1')} style={btnStyle('#d35400')}>Col 1</button>
        <button onClick={() => placeBet('column_2')} style={btnStyle('#d35400')}>Col 2</button>
        <button onClick={() => placeBet('column_3')} style={btnStyle('#d35400')}>Col 3</button>
      </div>

      {/* Favourite numbers */}
      {roulette.players.find(p => p.playerId === playerId)?.favouriteNumbers?.length ? (
        <div>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>MY NUMBERS</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {roulette.players.find(p => p.playerId === playerId)!.favouriteNumbers.map(n => (
              <button
                key={n}
                onClick={() => dispatchThunk('roulettePlaceBet', playerId, 'straight_up', chipValue, [n])}
                style={{
                  ...btnStyle(getColour(n)),
                  width: '48px',
                  height: '48px',
                  padding: '0',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Repeat last */}
      {roulette.roundNumber > 1 && (
        <button
          onClick={() => dispatchThunk('rouletteRepeatLastBets', playerId, [])}
          style={{
            ...btnStyle('#27ae60'),
            fontSize: '18px',
            padding: '16px',
          }}
        >
          REPEAT LAST
        </button>
      )}
    </div>
  )
}

/** Number grid tab — full 0-36 grid. */
function NumberGridTab({
  chipValue,
  dispatchThunk,
  playerId,
}: {
  chipValue: number
  dispatchThunk: (name: string, ...args: unknown[]) => void
  playerId: string
}) {
  const placeStraightUp = (n: number) => {
    dispatchThunk('roulettePlaceBet', playerId, 'straight_up', chipValue, [n])
  }

  const numBtnStyle = (n: number) => ({
    padding: '8px 4px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    borderRadius: '4px',
    border: '1px solid #555',
    cursor: 'pointer',
    background: getColour(n),
    color: 'white',
    minHeight: '44px',
    minWidth: '44px',
  })

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Zero */}
      <button onClick={() => placeStraightUp(0)} style={{ ...numBtnStyle(0), width: '100%', marginBottom: '8px' }}>
        0 - GREEN
      </button>

      {/* Number grid: 12 rows x 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
        {Array.from({ length: 36 }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => placeStraightUp(n)} style={numBtnStyle(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Results view — winning number, payout breakdown. */
function ResultsView({
  roulette,
  playerId,
}: {
  roulette: RouletteGameState
  playerId: string
}) {
  const player = roulette.players.find(p => p.playerId === playerId)
  const isWin = (player?.roundResult ?? 0) > 0

  return (
    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Winning number */}
      {roulette.winningNumber !== null && (
        <div style={{
          textAlign: 'center',
          fontSize: '48px',
          fontWeight: 'bold',
          padding: '24px',
          borderRadius: '12px',
          background: getColour(roulette.winningNumber),
        }}>
          {roulette.winningNumber}
        </div>
      )}

      {/* Player result */}
      {player && (
        <div style={{
          textAlign: 'center',
          padding: '16px',
          borderRadius: '8px',
          background: isWin ? '#27ae60' : player.totalBet === 0 ? '#555' : '#c0392b',
          fontWeight: 'bold',
          fontSize: '20px',
        }}>
          {player.totalBet === 0
            ? 'NO BET'
            : isWin
              ? `WON $${player.roundResult}`
              : `LOST $${Math.abs(player.roundResult)}`
          }
        </div>
      )}

      {/* Winning bets breakdown */}
      {roulette.bets
        .filter(b => b.playerId === playerId && b.status === 'won')
        .map(b => (
          <div key={b.id} style={{ textAlign: 'center', color: '#2ecc71' }}>
            {b.type.replace(/_/g, ' ').toUpperCase()}: +${b.payout}
          </div>
        ))
      }
    </div>
  )
}

export function RouletteController() {
  const phase = usePhase() as string | null
  const state = useStateSync()
  const dispatchThunk = useDispatchThunk() as unknown as (name: string, ...args: unknown[]) => void
  const [activeTab, setActiveTab] = useState<'quick' | 'numbers'>('quick')
  const [chipValue, setChipValue] = useState(5)

  const member = useSessionMember()
  const roulette = state?.roulette
  const playerId = member?.sessionMemberId ?? ''
  const walletBalance = state?.wallet?.[playerId] ?? 0
  const phaseStr = phase ?? ''

  const isBettingPhase = phaseStr === 'ROULETTE_PLACE_BETS'
  const isResultPhase = phaseStr === 'ROULETTE_RESULT'
    || phaseStr === 'ROULETTE_PAYOUT'
    || phaseStr === 'ROULETTE_ROUND_COMPLETE'

  const playerState = roulette?.players.find(p => p.playerId === playerId)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#1a1a2e',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h2 style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '16px' }}>Roulette</h2>

      {!roulette ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Waiting for round to start...
        </div>
      ) : isBettingPhase ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* Wallet and chip selector */}
          <div style={{ padding: '8px 16px', textAlign: 'center', fontSize: '14px', color: '#aaa' }}>
            Balance: ${walletBalance} | Bet: ${playerState?.totalBet ?? 0} | Round {roulette.roundNumber}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 16px 8px' }}>
            {CHIP_VALUES.map(v => (
              <button
                key={v}
                onClick={() => setChipValue(v)}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '20px',
                  border: chipValue === v ? '2px solid #f39c12' : '1px solid #555',
                  background: chipValue === v ? '#f39c12' : '#2a2a3e',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ${v}
              </button>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #555' }}>
            <button
              onClick={() => setActiveTab('quick')}
              style={{
                flex: 1,
                padding: '10px',
                background: activeTab === 'quick' ? '#2a2a4e' : 'transparent',
                color: 'white',
                border: 'none',
                borderBottom: activeTab === 'quick' ? '2px solid #f39c12' : 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              QUICK BETS
            </button>
            <button
              onClick={() => setActiveTab('numbers')}
              style={{
                flex: 1,
                padding: '10px',
                background: activeTab === 'numbers' ? '#2a2a4e' : 'transparent',
                color: 'white',
                border: 'none',
                borderBottom: activeTab === 'numbers' ? '2px solid #f39c12' : 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              NUMBER GRID
            </button>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'auto', paddingTop: '8px' }}>
            {activeTab === 'quick' ? (
              <QuickBetsTab
                roulette={roulette}
                chipValue={chipValue}
                dispatchThunk={dispatchThunk}
                playerId={playerId}
              />
            ) : (
              <NumberGridTab
                chipValue={chipValue}
                dispatchThunk={dispatchThunk}
                playerId={playerId}
              />
            )}
          </div>

          {/* Confirm / Clear buttons (sticky bottom) */}
          <div style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => dispatchThunk('rouletteClearBets', playerId)}
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '16px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: '1px solid #e74c3c',
                background: 'transparent',
                color: '#e74c3c',
                cursor: 'pointer',
              }}
            >
              CLEAR ALL
            </button>
            <button
              onClick={() => dispatchThunk('rouletteConfirmBets', playerId)}
              style={{
                flex: 2,
                padding: '14px',
                fontSize: '16px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                background: '#27ae60',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              CONFIRM BETS
            </button>
          </div>
        </div>
      ) : phaseStr === 'ROULETTE_NO_MORE_BETS' ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#f39c12', fontSize: '24px', fontWeight: 'bold', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          No more bets!
        </div>
      ) : phaseStr === 'ROULETTE_SPIN' ? (
        <div style={{ textAlign: 'center', padding: '48px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>The wheel spins...</div>
          <div style={{ fontSize: '14px', color: '#aaa' }}>Watch the TV!</div>
        </div>
      ) : isResultPhase ? (
        <ResultsView roulette={roulette} playerId={playerId} />
      ) : (
        <div style={{ textAlign: 'center', padding: '32px', color: '#aaa', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Waiting...
        </div>
      )}
    </div>
  )
}
