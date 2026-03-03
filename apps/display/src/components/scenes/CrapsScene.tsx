import { useMemo } from 'react'
import { useStateSyncSelector, usePhase } from '../../hooks/useVGFHooks.js'
import type {
  CrapsGameState,
  CrapsRollResult,
  CrapsBet,
  CrapsComeBet,
  CrapsPlayerState,
  CasinoPlayer,
} from '@weekend-casino/shared'

/** Player chip colours — matches other scenes. */
const PLAYER_COLOURS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12']

/** Bet type labels for display. */
const BET_LABELS: Record<string, string> = {
  pass_line: 'PASS',
  dont_pass: "DON'T PASS",
  come: 'COME',
  dont_come: "DON'T COME",
  place: 'PLACE',
  field: 'FIELD',
  pass_odds: 'PASS ODDS',
  dont_pass_odds: "DP ODDS",
  come_odds: 'COME ODDS',
  dont_come_odds: 'DC ODDS',
}

/** Render a single die face using CSS pips. */
function DieFace({ value, size = 80 }: { value: number; size?: number }) {
  const pipPositions: Record<number, Array<[string, string]>> = {
    1: [['50%', '50%']],
    2: [['25%', '25%'], ['75%', '75%']],
    3: [['25%', '25%'], ['50%', '50%'], ['75%', '75%']],
    4: [['25%', '25%'], ['75%', '25%'], ['25%', '75%'], ['75%', '75%']],
    5: [['25%', '25%'], ['75%', '25%'], ['50%', '50%'], ['25%', '75%'], ['75%', '75%']],
    6: [['25%', '25%'], ['75%', '25%'], ['25%', '50%'], ['75%', '50%'], ['25%', '75%'], ['75%', '75%']],
  }

  const pips = pipPositions[value] ?? []

  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#ffffff',
        borderRadius: size * 0.15,
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.3)',
        border: '2px solid rgba(200,200,200,0.3)',
      }}
      data-testid={`die-${value}`}
    >
      {pips.map(([left, top], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left,
            top,
            width: size * 0.18,
            height: size * 0.18,
            background: '#1a1a1a',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  )
}

/** Small dice pair for history display. */
function MiniDicePair({ roll }: { roll: CrapsRollResult }) {
  return (
    <div style={miniDicePairStyle}>
      <DieFace value={roll.die1} size={28} />
      <DieFace value={roll.die2} size={28} />
      <div style={miniTotalStyle}>{roll.total}</div>
    </div>
  )
}

/** Puck indicator — ON (white) or OFF (black). */
function Puck({ isOn, point }: { isOn: boolean; point: number | null }) {
  return (
    <div
      style={{
        ...puckStyle,
        background: isOn ? '#ffffff' : '#1a1a1a',
        color: isOn ? '#1a1a1a' : '#ffffff',
        border: isOn ? '3px solid #d4af37' : '3px solid #555',
        boxShadow: isOn
          ? '0 0 20px rgba(212, 175, 55, 0.6), 0 4px 16px rgba(0,0,0,0.5)'
          : '0 4px 16px rgba(0,0,0,0.5)',
      }}
      data-testid="craps-puck"
    >
      <div style={puckLabelStyle}>{isOn ? 'ON' : 'OFF'}</div>
      {isOn && point !== null && (
        <div style={puckPointStyle}>{point}</div>
      )}
    </div>
  )
}

/**
 * Craps Display Scene — 2D HTML overlay for MVP.
 *
 * Shows the craps table state: puck, dice, shooter, bets,
 * point number, roll history, and player info.
 * Will be upgraded to full 3D R3F scene in a later sprint.
 */
export function CrapsScene() {
  const craps = useStateSyncSelector((s) => s.craps) as CrapsGameState | undefined
  const phase = usePhase()
  const players = useStateSyncSelector((s) => s.players) as CasinoPlayer[] | undefined

  const shooterName = useMemo(() => {
    if (!craps?.shooterPlayerId || !players) return 'Unknown'
    const shooter = players.find((p) => p.id === craps.shooterPlayerId)
    return shooter?.name ?? craps.shooterPlayerId.slice(0, 8)
  }, [craps?.shooterPlayerId, players])

  const recentRolls = useMemo(() => {
    if (!craps?.rollHistory) return []
    return craps.rollHistory.slice(-5)
  }, [craps?.rollHistory])

  /** Group bets by player. */
  const betsByPlayer = useMemo(() => {
    if (!craps) return new Map<string, { bets: CrapsBet[]; comeBets: CrapsComeBet[] }>()
    const map = new Map<string, { bets: CrapsBet[]; comeBets: CrapsComeBet[] }>()

    for (const bet of craps.bets) {
      if (!map.has(bet.playerId)) map.set(bet.playerId, { bets: [], comeBets: [] })
      map.get(bet.playerId)!.bets.push(bet)
    }
    for (const cb of craps.comeBets) {
      if (!map.has(cb.playerId)) map.set(cb.playerId, { bets: [], comeBets: [] })
      map.get(cb.playerId)!.comeBets.push(cb)
    }
    return map
  }, [craps])

  /** Player colour lookup by ID. */
  const playerColour = useMemo(() => {
    const map: Record<string, string> = {}
    if (players) {
      players.forEach((p, i) => {
        map[p.id] = PLAYER_COLOURS[i % PLAYER_COLOURS.length]!
      })
    }
    return map
  }, [players])

  if (!craps) {
    return (
      <div style={containerStyle} data-testid="craps-scene">
        <div style={waitingStyle}>
          <div style={titleAccentStyle}>CRAPS</div>
          <div style={{ fontSize: '1.25rem', opacity: 0.6 }}>Waiting for game to start...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle} data-testid="craps-scene">
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <span style={titleAccentStyle}>CRAPS</span>
          <span style={phaseStyle}>{formatPhase(phase ?? '')}</span>
        </div>
        <div style={headerRightStyle}>
          <span style={roundLabelStyle}>Round {craps.roundNumber}</span>
        </div>
      </div>

      {/* ── Main table area ─────────────────────────────────── */}
      <div style={tableAreaStyle}>
        {/* Left column — puck + shooter + point */}
        <div style={leftColumnStyle}>
          <Puck isOn={craps.puckOn} point={craps.point} />

          <div style={shooterBoxStyle}>
            <div style={labelStyle}>SHOOTER</div>
            <div style={shooterNameStyle}>{shooterName}</div>
          </div>

          {craps.point !== null && (
            <div style={pointDisplayStyle} data-testid="craps-point">
              <div style={labelStyle}>POINT</div>
              <div style={pointNumberStyle}>{craps.point}</div>
            </div>
          )}

          {craps.sevenOut && (
            <div style={outcomeStyle} data-testid="craps-seven-out">
              SEVEN OUT!
            </div>
          )}
          {craps.pointHit && (
            <div style={{ ...outcomeStyle, color: '#4ade80' }} data-testid="craps-point-hit">
              POINT HIT!
            </div>
          )}
        </div>

        {/* Centre — dice display */}
        <div style={centreColumnStyle}>
          {craps.lastRollDie1 > 0 && craps.lastRollDie2 > 0 ? (
            <div style={diceAreaStyle} data-testid="craps-dice">
              <div style={diceRowStyle}>
                <DieFace value={craps.lastRollDie1} size={96} />
                <DieFace value={craps.lastRollDie2} size={96} />
              </div>
              <div style={diceTotalStyle}>{craps.lastRollTotal}</div>
              {craps.rollHistory.length > 0 && (
                <div style={hardwayStyle}>
                  {craps.rollHistory[craps.rollHistory.length - 1]?.isHardway && (
                    <span style={hardwayBadgeStyle}>HARDWAY</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={noDiceStyle}>
              <div style={{ fontSize: '2rem', opacity: 0.3 }}>NO ROLL YET</div>
            </div>
          )}

          {/* Roll history */}
          {recentRolls.length > 0 && (
            <div style={rollHistoryStyle}>
              <div style={labelStyle}>LAST ROLLS</div>
              <div style={rollHistoryRowStyle}>
                {recentRolls.map((roll, i) => (
                  <MiniDicePair key={i} roll={roll} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — active bets */}
        <div style={rightColumnStyle}>
          <div style={labelStyle}>ACTIVE BETS</div>
          <div style={betsListStyle}>
            {craps.players.map((cp: CrapsPlayerState) => {
              const playerData = betsByPlayer.get(cp.playerId)
              const pName = players?.find((p) => p.id === cp.playerId)?.name ?? cp.playerId.slice(0, 8)
              const colour = playerColour[cp.playerId] ?? '#888'
              const allBets = [
                ...(playerData?.bets.filter((b) => b.status === 'active') ?? []),
              ]
              const allComeBets = playerData?.comeBets.filter((c) => c.status === 'active') ?? []

              if (allBets.length === 0 && allComeBets.length === 0) return null

              return (
                <div key={cp.playerId} style={playerBetsStyle}>
                  <div style={{ ...playerBetNameStyle, color: colour }}>{pName}</div>
                  {allBets.map((bet) => (
                    <div key={bet.id} style={betRowStyle}>
                      <span style={betTypeStyle}>
                        {BET_LABELS[bet.type] ?? bet.type}
                        {bet.targetNumber != null ? ` ${bet.targetNumber}` : ''}
                      </span>
                      <span style={betAmountStyle}>${bet.amount}</span>
                    </div>
                  ))}
                  {allComeBets.map((cb) => (
                    <div key={cb.id} style={betRowStyle}>
                      <span style={betTypeStyle}>
                        {cb.type === 'come' ? 'COME' : "DON'T COME"}
                        {cb.comePoint != null ? ` (${cb.comePoint})` : ''}
                      </span>
                      <span style={betAmountStyle}>${cb.amount}</span>
                    </div>
                  ))}
                </div>
              )
            })}
            {Array.from(betsByPlayer.keys()).length === 0 && (
              <div style={{ opacity: 0.4, fontSize: '0.875rem' }}>No bets placed</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar — player info ─────────────────────────── */}
      <div style={bottomBarStyle}>
        {craps.players.map((cp: CrapsPlayerState, i: number) => {
          const pName = players?.find((p) => p.id === cp.playerId)?.name ?? cp.playerId.slice(0, 8)
          const colour = PLAYER_COLOURS[i % PLAYER_COLOURS.length]
          const isShooter = cp.playerId === craps.shooterPlayerId

          return (
            <div
              key={cp.playerId}
              style={{
                ...playerCardStyle,
                borderColor: colour,
                background: isShooter
                  ? 'rgba(212, 175, 55, 0.15)'
                  : 'rgba(255, 255, 255, 0.05)',
              }}
            >
              {isShooter && <div style={shooterBadgeStyle}>SHOOTER</div>}
              <div style={{ ...playerCardNameStyle, color: colour }}>{pName}</div>
              <div style={playerCardChipsStyle}>
                At risk: <strong>${cp.totalAtRisk}</strong>
              </div>
              {cp.roundResult !== 0 && (
                <div
                  style={{
                    ...playerCardResultStyle,
                    color: cp.roundResult > 0 ? '#4ade80' : '#f87171',
                  }}
                >
                  {cp.roundResult > 0 ? '+' : ''}{cp.roundResult}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatPhase(phase: string): string {
  return phase
    .replace(/^CRAPS_/, '')
    .replace(/_/g, ' ')
}

// ── Styles ──────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(135deg, #0a0f18 0%, #0d2a1a 50%, #0a1a0a 100%)',
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  zIndex: 20,
  overflow: 'hidden',
}

const waitingStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 2rem',
  borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
}

const headerLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '1.5rem',
}

const headerRightStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
}

const titleAccentStyle: React.CSSProperties = {
  fontFamily: "'Georgia', 'Garamond', serif",
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#d4af37',
  textShadow: '0 0 20px rgba(212, 175, 55, 0.4), 0 2px 8px rgba(0,0,0,0.8)',
  letterSpacing: '0.15em',
}

const phaseStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'rgba(255,255,255,0.5)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
}

const roundLabelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'rgba(212, 175, 55, 0.7)',
  fontWeight: 600,
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  letterSpacing: '0.15em',
  color: 'rgba(212, 175, 55, 0.6)',
  textTransform: 'uppercase',
  marginBottom: '0.5rem',
}

const tableAreaStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  gap: '2rem',
  padding: '1.5rem 2rem',
  minHeight: 0,
}

const leftColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1.5rem',
  width: '180px',
  flexShrink: 0,
}

const centreColumnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2rem',
}

const rightColumnStyle: React.CSSProperties = {
  width: '240px',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
}

// ── Puck ────────────────────────────────────────────────────────────

const puckStyle: React.CSSProperties = {
  width: 100,
  height: 100,
  borderRadius: '50%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  textTransform: 'uppercase',
}

const puckLabelStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  letterSpacing: '0.1em',
}

const puckPointStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 800,
  lineHeight: 1,
}

// ── Shooter + Point ─────────────────────────────────────────────────

const shooterBoxStyle: React.CSSProperties = {
  textAlign: 'center',
}

const shooterNameStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: '#d4af37',
}

const pointDisplayStyle: React.CSSProperties = {
  textAlign: 'center',
}

const pointNumberStyle: React.CSSProperties = {
  fontSize: '3rem',
  fontWeight: 800,
  color: '#d4af37',
  textShadow: '0 0 24px rgba(212, 175, 55, 0.5)',
  lineHeight: 1,
}

const outcomeStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 800,
  color: '#f87171',
  textShadow: '0 0 16px rgba(248, 113, 113, 0.5)',
  letterSpacing: '0.1em',
  textAlign: 'center',
}

// ── Dice ────────────────────────────────────────────────────────────

const diceAreaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
}

const diceRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.5rem',
}

const diceTotalStyle: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 800,
  color: '#d4af37',
  textShadow: '0 0 16px rgba(212, 175, 55, 0.5)',
}

const noDiceStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.5,
}

const hardwayStyle: React.CSSProperties = {
  minHeight: '1.5rem',
}

const hardwayBadgeStyle: React.CSSProperties = {
  background: 'rgba(212, 175, 55, 0.2)',
  border: '1px solid rgba(212, 175, 55, 0.4)',
  borderRadius: '4px',
  padding: '0.125rem 0.75rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  color: '#d4af37',
}

// ── Roll History ────────────────────────────────────────────────────

const rollHistoryStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}

const rollHistoryRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
}

const miniDicePairStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
}

const miniTotalStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.6)',
}

// ── Bets ────────────────────────────────────────────────────────────

const betsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
}

const playerBetsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  padding: '0.5rem',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '6px',
}

const playerBetNameStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '0.8rem',
  letterSpacing: '0.05em',
}

const betRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.8rem',
  paddingLeft: '0.5rem',
}

const betTypeStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.7)',
}

const betAmountStyle: React.CSSProperties = {
  color: '#d4af37',
  fontWeight: 600,
}

// ── Bottom Bar — Player Info ────────────────────────────────────────

const bottomBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  padding: '1rem 2rem',
  borderTop: '1px solid rgba(212, 175, 55, 0.2)',
  justifyContent: 'center',
}

const playerCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.75rem 1.25rem',
  borderRadius: '8px',
  borderBottom: '3px solid',
  minWidth: '140px',
  position: 'relative',
}

const shooterBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-8px',
  right: '-8px',
  background: '#d4af37',
  color: '#0a0a0a',
  fontSize: '0.6rem',
  fontWeight: 800,
  padding: '2px 6px',
  borderRadius: '4px',
  letterSpacing: '0.05em',
}

const playerCardNameStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '0.9rem',
}

const playerCardChipsStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'rgba(255,255,255,0.6)',
}

const playerCardResultStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 700,
}
