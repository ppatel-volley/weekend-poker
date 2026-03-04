/**
 * Craps controller — multi-view phone UI for craps gameplay.
 *
 * Phase-driven layout:
 *   CRAPS_NEW_SHOOTER: Shooter announcement banner
 *   CRAPS_COME_OUT_BETTING: Pass/Don't Pass + Field + chip selector
 *   CRAPS_COME_OUT_ROLL / CRAPS_POINT_ROLL: Shooter ROLL button or waiting
 *   CRAPS_COME_OUT_RESOLUTION / CRAPS_POINT_RESOLUTION: Dice result + bet outcomes
 *   CRAPS_POINT_BETTING: Come/Don't Come, Place bets, Field, Odds
 *   CRAPS_ROUND_COMPLETE: Round summary
 */

import { useState } from 'react'
import {
  usePhase,
  useDispatch,
  useSessionMemberSafe,
  useStateSync,
} from '../../hooks/useVGFHooks.js'
import type { CrapsGameState, CrapsBetType } from '@weekend-casino/shared'
import { CRAPS_PLACE_NUMBERS } from '@weekend-casino/shared'

const CHIP_VALUES = [10, 25, 50, 100]

// ── Shared Styles ─────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  background:
    'radial-gradient(ellipse at 50% 0%, rgba(0, 60, 40, 0.3) 0%, transparent 60%), ' +
    'linear-gradient(180deg, #0d1a2a 0%, #0a0f18 50%, #060a10 100%)',
  color: 'white',
  fontFamily: "'Georgia', 'Garamond', 'Times New Roman', serif",
}

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '12px 0 0',
  fontSize: '16px',
  letterSpacing: '0.12em',
  color: 'rgba(212, 175, 55, 0.9)',
}

const walletStyle: React.CSSProperties = {
  padding: '8px 16px',
  textAlign: 'center',
  fontSize: '13px',
  color: 'rgba(255, 255, 255, 0.5)',
  fontFamily: 'system-ui, sans-serif',
}

const waitingStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '32px',
  color: 'rgba(255, 255, 255, 0.4)',
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'system-ui, sans-serif',
}

function betButton(bg: string, extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: '14px',
    fontSize: '15px',
    fontWeight: 'bold',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    background: bg,
    color: 'white',
    minHeight: '48px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: 'system-ui, sans-serif',
    ...extra,
  }
}

// ── Phase Sub-Views ───────────────────────────────────────────────

/** New Shooter announcement banner. */
function NewShooterView({
  craps,
  playerId,
  walletBalance,
}: {
  craps: CrapsGameState
  playerId: string
  walletBalance: number
}) {
  const isShooter = craps.shooterPlayerId === playerId

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      <div style={{
        padding: '24px 32px',
        borderRadius: '14px',
        border: `2px solid ${isShooter ? 'rgba(212, 175, 55, 0.6)' : 'rgba(255, 255, 255, 0.15)'}`,
        background: isShooter
          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(139, 105, 20, 0.3) 100%)'
          : 'linear-gradient(135deg, rgba(30, 40, 60, 0.8) 0%, rgba(20, 28, 45, 0.8) 100%)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: isShooter ? '#f5d680' : 'white',
          marginBottom: '8px',
        }}>
          {isShooter ? "YOU'RE THE SHOOTER!" : 'NEW SHOOTER'}
        </div>
        {!isShooter && (
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'system-ui, sans-serif' }}>
            Waiting for the shooter to step up...
          </div>
        )}
      </div>
      <div style={walletStyle}>
        Balance: ${walletBalance}
      </div>
    </div>
  )
}

/** Come-out betting view — Pass/Don't Pass, Field, chip selector. */
function ComeOutBettingView({
  craps,
  playerId,
  walletBalance,
  dispatch,
}: {
  craps: CrapsGameState
  playerId: string
  walletBalance: number
  dispatch: (name: string, ...args: unknown[]) => void
}) {
  const [chipValue, setChipValue] = useState(CHIP_VALUES[0])

  const placeBet = (type: CrapsBetType, amount?: number) => {
    dispatch('crapsValidateAndPlaceBet', playerId, type, amount ?? chipValue)
  }

  const confirmBets = () => {
    dispatch('crapsConfirmBets', playerId)
  }

  const playerBets = craps.bets.filter(b => b.playerId === playerId && b.status === 'active')
  const totalBet = playerBets.reduce((sum, b) => sum + b.amount, 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '12px 16px 4px',
        fontSize: '18px',
        fontWeight: 'bold',
        letterSpacing: '0.15em',
        color: '#f5d680',
      }}>
        COME OUT ROLL
      </div>
      <div style={walletStyle}>
        Balance: ${walletBalance} | Bet: ${totalBet}
      </div>

      {/* Chip selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 16px 12px' }}>
        {CHIP_VALUES.map(v => (
          <button
            key={v}
            onClick={() => setChipValue(v)}
            data-testid={`chip-${v}`}
            style={{
              padding: '8px 14px',
              fontSize: '14px',
              fontWeight: 'bold',
              borderRadius: '20px',
              border: chipValue === v ? '2px solid rgba(212, 175, 55, 0.8)' : '1px solid rgba(255, 255, 255, 0.15)',
              background: chipValue === v ? 'rgba(212, 175, 55, 0.3)' : 'rgba(30, 40, 60, 0.6)',
              color: chipValue === v ? '#f5d680' : 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            ${v}
          </button>
        ))}
      </div>

      {/* Pass / Don't Pass */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '0 16px 10px' }}>
        <button
          onClick={() => placeBet('pass_line')}
          data-testid="pass-line-btn"
          style={betButton('linear-gradient(135deg, #2d8a42 0%, #1f6030 100%)')}
        >
          PASS LINE
          <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: 'normal', fontFamily: 'system-ui, sans-serif' }}>Win on 7 or 11</span>
        </button>
        <button
          onClick={() => placeBet('dont_pass')}
          data-testid="dont-pass-btn"
          style={betButton('linear-gradient(135deg, #8a2d2d 0%, #6a2020 100%)')}
        >
          DON'T PASS
          <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: 'normal', fontFamily: 'system-ui, sans-serif' }}>Win on 2 or 3</span>
        </button>
      </div>

      {/* Field bet */}
      <div style={{ padding: '0 16px 10px' }}>
        <button
          onClick={() => placeBet('field')}
          data-testid="field-btn"
          style={betButton('linear-gradient(135deg, #8a7a2d 0%, #6a5a1d 100%)', { width: '100%' })}
        >
          FIELD
          <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: 'normal', fontFamily: 'system-ui, sans-serif' }}>2,3,4,9,10,11,12 win</span>
        </button>
      </div>

      {/* Active bets summary */}
      {playerBets.length > 0 && (
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(212, 175, 55, 0.5)', marginBottom: '6px', fontFamily: 'system-ui, sans-serif' }}>
            ACTIVE BETS
          </div>
          {playerBets.map(b => (
            <div key={b.id} style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '2px', fontFamily: 'system-ui, sans-serif' }}>
              {b.type.replace(/_/g, ' ').toUpperCase()}: ${b.amount}
            </div>
          ))}
        </div>
      )}

      {/* Confirm */}
      <div style={{ padding: '12px 16px', marginTop: 'auto' }}>
        <button
          onClick={confirmBets}
          data-testid="confirm-bets-btn"
          style={betButton('linear-gradient(135deg, #2d8a42 0%, #25733a 100%)', {
            width: '100%',
            fontSize: '18px',
            padding: '18px',
            boxShadow: '0 4px 20px rgba(74, 222, 128, 0.3)',
          })}
        >
          CONFIRM BETS
        </button>
      </div>
    </div>
  )
}

/** Roll view — shooter gets ROLL button, others wait. */
function RollView({
  craps,
  playerId,
  dispatch,
}: {
  craps: CrapsGameState
  playerId: string
  dispatch: (name: string, ...args: unknown[]) => void
}) {
  const isShooter = craps.shooterPlayerId === playerId
  const isPointPhase = craps.puckOn

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      {isPointPhase && craps.point !== null && (
        <div style={{
          fontSize: '14px',
          letterSpacing: '0.15em',
          color: 'rgba(212, 175, 55, 0.7)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          POINT IS {craps.point}
        </div>
      )}

      {isShooter ? (
        <>
          <style>{`
            @keyframes rollPulse {
              0%, 100% {
                box-shadow: 0 4px 30px rgba(212, 175, 55, 0.4),
                            0 0 60px rgba(212, 175, 55, 0.15);
                transform: scale(1);
              }
              50% {
                box-shadow: 0 4px 50px rgba(212, 175, 55, 0.7),
                            0 0 100px rgba(212, 175, 55, 0.3);
                transform: scale(1.02);
              }
            }
          `}</style>
          <button
            onClick={() => dispatch('crapsSetRollComplete', true)}
            data-testid="roll-btn"
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              border: '3px solid rgba(212, 175, 55, 0.6)',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(139, 105, 20, 0.4) 100%)',
              color: '#f5d680',
              fontSize: '32px',
              fontWeight: 'bold',
              letterSpacing: '0.2em',
              cursor: 'pointer',
              animation: 'rollPulse 2s ease-in-out infinite',
              fontFamily: "'Georgia', 'Garamond', serif",
            }}
          >
            ROLL!
          </button>
        </>
      ) : (
        <div style={waitingStyle} data-testid="waiting-for-roll">
          Waiting for the shooter to roll...
        </div>
      )}

      {/* Active bets summary */}
      {craps.bets.filter(b => b.playerId === playerId && b.status === 'active').length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(212, 175, 55, 0.5)', marginBottom: '6px', fontFamily: 'system-ui, sans-serif' }}>
            YOUR BETS
          </div>
          {craps.bets.filter(b => b.playerId === playerId && b.status === 'active').map(b => (
            <div key={b.id} style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'system-ui, sans-serif' }}>
              {b.type.replace(/_/g, ' ').toUpperCase()}: ${b.amount}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Resolution view — dice result + per-bet outcomes. */
function ResolutionView({
  craps,
  playerId,
}: {
  craps: CrapsGameState
  playerId: string
}) {
  const total = craps.lastRollTotal
  const die1 = craps.lastRollDie1
  const die2 = craps.lastRollDie2
  const player = craps.players.find(p => p.playerId === playerId)
  const netResult = player?.roundResult ?? 0

  // Determine outcome text
  let outcomeText = ''
  let outcomeColour = 'white'
  if (craps.sevenOut) {
    outcomeText = 'SEVEN OUT!'
    outcomeColour = '#e74c3c'
  } else if (craps.pointHit) {
    outcomeText = 'POINT HIT!'
    outcomeColour = '#4ade80'
  } else if (!craps.puckOn && total === 7) {
    outcomeText = 'SEVEN! WINNER!'
    outcomeColour = '#4ade80'
  } else if (!craps.puckOn && total === 11) {
    outcomeText = 'YO ELEVEN!'
    outcomeColour = '#4ade80'
  } else if (!craps.puckOn && (total === 2 || total === 3 || total === 12)) {
    outcomeText = 'CRAPS!'
    outcomeColour = '#e74c3c'
  } else if (!craps.puckOn && craps.point !== null) {
    outcomeText = `POINT IS ${craps.point}`
    outcomeColour = '#f5d680'
  }

  const playerBets = craps.bets.filter(b => b.playerId === playerId && (b.status === 'won' || b.status === 'lost'))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px' }}>
      {/* Dice display */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '12px',
          background: 'white', color: '#1a1a2e', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: 'bold',
        }}>
          {die1}
        </div>
        <div style={{
          width: '64px', height: '64px', borderRadius: '12px',
          background: 'white', color: '#1a1a2e', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', fontWeight: 'bold',
        }}>
          {die2}
        </div>
      </div>
      <div style={{ fontSize: '36px', fontWeight: 'bold' }} data-testid="dice-total">
        = {total}
      </div>

      {/* Outcome */}
      {outcomeText && (
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: outcomeColour,
          letterSpacing: '0.1em',
        }} data-testid="outcome-text">
          {outcomeText}
        </div>
      )}

      {/* Per-bet results */}
      {playerBets.length > 0 && (
        <div style={{ width: '100%', maxWidth: '320px' }}>
          {playerBets.map(b => (
            <div key={b.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', fontSize: '14px',
              fontFamily: 'system-ui, sans-serif',
            }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {b.type.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span style={{ color: b.status === 'won' ? '#4ade80' : '#e74c3c', fontWeight: 'bold' }}>
                {b.status === 'won' ? `+$${b.payout}` : `-$${b.amount}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Net result */}
      {netResult !== 0 && (
        <div style={{
          padding: '12px 24px',
          borderRadius: '12px',
          background: netResult > 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(222, 74, 74, 0.15)',
          border: `1px solid ${netResult > 0 ? 'rgba(74, 222, 128, 0.3)' : 'rgba(222, 74, 74, 0.3)'}`,
          fontSize: '18px',
          fontWeight: 'bold',
          color: netResult > 0 ? '#4ade80' : '#e74c3c',
          fontFamily: 'system-ui, sans-serif',
        }}>
          {netResult > 0 ? `+$${netResult}` : `-$${Math.abs(netResult)}`}
        </div>
      )}
    </div>
  )
}

/** Point betting view — Come/Don't Come, Place bets, Field, Odds. */
function PointBettingView({
  craps,
  playerId,
  walletBalance,
  dispatch,
}: {
  craps: CrapsGameState
  playerId: string
  walletBalance: number
  dispatch: (name: string, ...args: unknown[]) => void
}) {
  const [chipValue, setChipValue] = useState(CHIP_VALUES[0])

  const placeBet = (type: CrapsBetType, targetNumber?: number) => {
    if (targetNumber !== undefined) {
      dispatch('crapsValidateAndPlaceBet', playerId, type, chipValue, targetNumber)
    } else {
      dispatch('crapsValidateAndPlaceBet', playerId, type, chipValue)
    }
  }

  const confirmBets = () => {
    dispatch('crapsConfirmBets', playerId)
  }

  const hasPassLine = craps.bets.some(b => b.playerId === playerId && b.type === 'pass_line' && b.status === 'active')
  const playerBets = craps.bets.filter(b => b.playerId === playerId && b.status === 'active')
  const totalBet = playerBets.reduce((sum, b) => sum + b.amount, 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        padding: '12px 16px 4px',
      }}>
        <div style={{ fontSize: '14px', letterSpacing: '0.15em', color: 'rgba(212, 175, 55, 0.7)', fontFamily: 'system-ui, sans-serif' }}>
          POINT IS
        </div>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f5d680' }}>
          {craps.point}
        </div>
      </div>
      <div style={walletStyle}>
        Balance: ${walletBalance} | Bet: ${totalBet}
      </div>

      {/* Chip selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 16px 12px' }}>
        {CHIP_VALUES.map(v => (
          <button
            key={v}
            onClick={() => setChipValue(v)}
            style={{
              padding: '8px 14px',
              fontSize: '14px',
              fontWeight: 'bold',
              borderRadius: '20px',
              border: chipValue === v ? '2px solid rgba(212, 175, 55, 0.8)' : '1px solid rgba(255, 255, 255, 0.15)',
              background: chipValue === v ? 'rgba(212, 175, 55, 0.3)' : 'rgba(30, 40, 60, 0.6)',
              color: chipValue === v ? '#f5d680' : 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            ${v}
          </button>
        ))}
      </div>

      {/* Come / Don't Come */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '0 16px 10px' }}>
        <button
          onClick={() => placeBet('come')}
          data-testid="come-btn"
          style={betButton('linear-gradient(135deg, #2d8a42 0%, #1f6030 100%)')}
        >
          COME
          <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: 'normal', fontFamily: 'system-ui, sans-serif' }}>Like Pass, mid-round</span>
        </button>
        <button
          onClick={() => placeBet('dont_come')}
          data-testid="dont-come-btn"
          style={betButton('linear-gradient(135deg, #8a2d2d 0%, #6a2020 100%)')}
        >
          DON'T COME
          <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: 'normal', fontFamily: 'system-ui, sans-serif' }}>Like Don't Pass, mid-round</span>
        </button>
      </div>

      {/* Place bets grid */}
      <div style={{ padding: '0 16px 10px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(212, 175, 55, 0.5)', marginBottom: '6px', fontFamily: 'system-ui, sans-serif' }}>
          PLACE BETS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {CRAPS_PLACE_NUMBERS.map(n => (
            <button
              key={n}
              onClick={() => placeBet('place', n)}
              data-testid={`place-${n}-btn`}
              style={betButton('linear-gradient(135deg, #4a3080 0%, #362260 100%)', { fontSize: '16px' })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Field */}
      <div style={{ padding: '0 16px 10px' }}>
        <button
          onClick={() => placeBet('field')}
          style={betButton('linear-gradient(135deg, #8a7a2d 0%, #6a5a1d 100%)', { width: '100%' })}
        >
          FIELD
        </button>
      </div>

      {/* Add Odds — only if player has a pass line bet */}
      {hasPassLine && (
        <div style={{ padding: '0 16px 10px' }}>
          <button
            onClick={() => placeBet('pass_odds')}
            data-testid="add-odds-btn"
            style={betButton('linear-gradient(135deg, #2980b9 0%, #1a5276 100%)', { width: '100%' })}
          >
            ADD ODDS
          </button>
        </div>
      )}

      {/* Confirm */}
      <div style={{ padding: '12px 16px', marginTop: 'auto' }}>
        <button
          onClick={confirmBets}
          data-testid="confirm-bets-btn"
          style={betButton('linear-gradient(135deg, #2d8a42 0%, #25733a 100%)', {
            width: '100%',
            fontSize: '18px',
            padding: '18px',
            boxShadow: '0 4px 20px rgba(74, 222, 128, 0.3)',
          })}
        >
          CONFIRM BETS
        </button>
      </div>
    </div>
  )
}

/** Round complete summary. */
function RoundCompleteView({
  craps,
  playerId,
}: {
  craps: CrapsGameState
  playerId: string
}) {
  const player = craps.players.find(p => p.playerId === playerId)
  const netResult = player?.roundResult ?? 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.12em', color: 'rgba(212, 175, 55, 0.9)' }}>
        ROUND COMPLETE
      </div>
      {netResult !== 0 && (
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: netResult > 0 ? '#4ade80' : '#e74c3c',
        }}>
          {netResult > 0 ? `+$${netResult}` : `-$${Math.abs(netResult)}`}
        </div>
      )}
      <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'system-ui, sans-serif' }}>
        {craps.sevenOut ? 'New shooter coming up...' : 'Next round starting...'}
      </div>
    </div>
  )
}

// ── Main Controller ───────────────────────────────────────────────

export function CrapsController() {
  const phase = usePhase() as string | null
  const state = useStateSync()
  const dispatch = useDispatch()
  const member = useSessionMemberSafe()

  const craps = state?.craps as CrapsGameState | undefined
  const playerId = member?.sessionMemberId ?? ''
  const walletBalance = (state?.wallet as Record<string, number> | undefined)?.[playerId] ?? 0
  const phaseStr = phase ?? ''

  const castDispatch = dispatch as unknown as (name: string, ...args: unknown[]) => void

  return (
    <div style={containerStyle}>
      <h2 data-testid="game-heading" style={headerStyle}>CRAPS</h2>

      {!craps ? (
        <div style={waitingStyle}>
          Waiting for round to start...
        </div>
      ) : phaseStr === 'CRAPS_NEW_SHOOTER' ? (
        <NewShooterView craps={craps} playerId={playerId} walletBalance={walletBalance} />
      ) : phaseStr === 'CRAPS_COME_OUT_BETTING' ? (
        <ComeOutBettingView craps={craps} playerId={playerId} walletBalance={walletBalance} dispatch={castDispatch} />
      ) : phaseStr === 'CRAPS_COME_OUT_ROLL' || phaseStr === 'CRAPS_POINT_ROLL' ? (
        <RollView craps={craps} playerId={playerId} dispatch={castDispatch} />
      ) : phaseStr === 'CRAPS_COME_OUT_RESOLUTION' || phaseStr === 'CRAPS_POINT_RESOLUTION' ? (
        <ResolutionView craps={craps} playerId={playerId} />
      ) : phaseStr === 'CRAPS_POINT_BETTING' ? (
        <PointBettingView craps={craps} playerId={playerId} walletBalance={walletBalance} dispatch={castDispatch} />
      ) : phaseStr === 'CRAPS_ROUND_COMPLETE' ? (
        <RoundCompleteView craps={craps} playerId={playerId} />
      ) : (
        <div style={waitingStyle}>
          Waiting...
        </div>
      )}
    </div>
  )
}
