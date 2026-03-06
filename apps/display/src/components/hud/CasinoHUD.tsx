import { useState, useEffect, useCallback, useRef } from 'react'
import { CASINO_GAME_LABELS, MAX_PLAYERS } from '@weekend-casino/shared'
import type { CasinoGame, GameNightGameState, ChallengeSummary, ChallengeTier } from '@weekend-casino/shared'
import { QRCodeSVG } from 'qrcode.react'
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useCurrentGame, useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import { useSessionId } from '../../hooks/useSessionId.js'
import { useInputMode } from '../../platform/InputModeProvider.js'
import { BonusPopup } from './BonusPopup.js'

/** Formats seconds as HH:MM:SS. */
function formatSessionTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hrs > 0
    ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`
}

/** Tier colours for challenge progress indicators. */
const TIER_COLOURS: Record<ChallengeTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
}

/** Focus indicator styles for TV remote navigation. */
const focusOutline = '2px solid #60a5fa'
const focusShadow = '0 0 10px rgba(96, 165, 250, 0.5)'

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  zIndex: 10,
}

const topBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 20px',
  background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
}

const bottomBarStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '12px 20px',
  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
  display: 'flex',
  justifyContent: 'center',
  gap: '2rem',
  fontSize: '0.875rem',
}

/**
 * Persistent casino HUD — 2D HTML overlay rendered on top of the R3F canvas.
 *
 * Shows: current game indicator, wallet balance, session timer.
 * Visible during all game scenes, hidden in lobby.
 * When in remote mode, HUD elements show focus indicators for D-pad navigation.
 */
export function CasinoHUD() {
  const currentGame = useCurrentGame()
  const wallet = useStateSyncSelector((s) => s.wallet)
  const players = useStateSyncSelector((s) => s.players)
  const dealerMessage = useStateSyncSelector((s) => s.dealerMessage)
  const gameNight = useStateSyncSelector((s) => s.gameNight) as GameNightGameState | undefined
  const challengeSummary = useStateSyncSelector((s) => s.challengeSummary) as Record<string, ChallengeSummary[]> | undefined
  const lastDailyBonus = useStateSyncSelector((s) => s.lastDailyBonus) as
    | { amount: number; streakDay: number; multiplierApplied: boolean; timestamp: number }
    | undefined
  const sessionId = useSessionId()
  const { inputMode } = useInputMode()
  const isRemote = inputMode === 'remote'

  const baseControllerUrl = import.meta.env['VITE_CONTROLLER_URL'] as string | undefined
  const controllerUrl = baseControllerUrl
    ? `${baseControllerUrl}?sessionId=${sessionId}`
    : `http://${window.location.hostname}:5174?sessionId=${sessionId}`
  const humanPlayers = players?.filter((p: any) => !p.isBot).length ?? 0
  const showJoinQR = humanPlayers < MAX_PLAYERS

  const { ref: hudRef } = useFocusable({
    focusKey: 'CASINO_HUD',
    trackChildren: true,
    focusable: isRemote,
  })

  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [bonusData, setBonusData] = useState<{
    amount: number; streakDay: number; multiplierApplied: boolean
  } | null>(null)
  const lastBonusTimestamp = useRef<number>(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Show bonus popup when server sets lastDailyBonus on state
  useEffect(() => {
    if (lastDailyBonus && lastDailyBonus.timestamp !== lastBonusTimestamp.current) {
      lastBonusTimestamp.current = lastDailyBonus.timestamp
      setBonusData({
        amount: lastDailyBonus.amount,
        streakDay: lastDailyBonus.streakDay,
        multiplierApplied: lastDailyBonus.multiplierApplied,
      })
    }
  }, [lastDailyBonus])

  const dismissBonus = useCallback(() => setBonusData(null), [])

  // Derive challenge indicators from all players' summaries
  const challengeIndicators = deriveChallengeIndicators(challengeSummary)

  // Hide HUD in lobby — but still show the daily bonus popup if triggered
  if (!currentGame) {
    return bonusData ? (
      <div style={overlayStyle}>
        <BonusPopup
          amount={bonusData.amount}
          streakDay={bonusData.streakDay}
          multiplierApplied={bonusData.multiplierApplied}
          onDismiss={dismissBonus}
        />
      </div>
    ) : null
  }

  const gameLabel = CASINO_GAME_LABELS[currentGame as CasinoGame] ?? currentGame

  return (
    <div ref={hudRef} style={overlayStyle} data-testid="casino-hud">
      {/* Daily bonus popup */}
      {bonusData && (
        <BonusPopup
          amount={bonusData.amount}
          streakDay={bonusData.streakDay}
          multiplierApplied={bonusData.multiplierApplied}
          onDismiss={dismissBonus}
        />
      )}

      {/* Top bar */}
      <div style={topBarStyle}>
        <div>
          <FocusableHUDItem focusKey="HUD_GAME_LABEL" isRemote={isRemote}>
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>
              {gameLabel}
            </span>
            {gameNight?.active && (
              <span
                style={{
                  marginLeft: '0.75rem',
                  fontSize: '0.75rem',
                  color: 'rgba(212, 175, 55, 0.9)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
                data-testid="gn-hud-indicator"
              >
                Game {(gameNight.currentGameIndex ?? 0) + 1}/{gameNight.gameLineup?.length ?? 0}
                {' \u00B7 '}
                {Object.values(gameNight.playerScores ?? {}).reduce(
                  (max, p) => Math.max(max, (p as any)?.totalScore ?? 0), 0,
                )} pts
              </span>
            )}
          </FocusableHUDItem>
          {/* Challenge progress indicators */}
          {challengeIndicators.length > 0 && (
            <div
              style={{ display: 'flex', gap: 6, marginTop: 4, marginLeft: 8 }}
              data-testid="challenge-indicators"
            >
              {challengeIndicators.map((ci, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: `2px solid ${TIER_COLOURS[ci.tier]}`,
                    background: ci.completed ? TIER_COLOURS[ci.tier] : 'transparent',
                  }}
                  data-testid={`challenge-dot-${ci.tier}`}
                />
              ))}
            </div>
          )}
        </div>
        <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>
          {formatSessionTime(sessionSeconds)}
        </span>
      </div>

      {/* Join QR — shown until table is full */}
      {showJoinQR && (
        <a
          href={controllerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            top: 60,
            right: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'auto',
            cursor: 'pointer',
            textDecoration: 'none',
            opacity: 0.85,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85' }}
        >
          <div
            style={{
              padding: 8,
              background: 'white',
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(212, 175, 55, 0.3)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
            }}
          >
            <QRCodeSVG value={controllerUrl} size={80} />
          </div>
          <span
            style={{
              fontSize: '0.65rem',
              color: 'rgba(212, 175, 55, 0.8)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          >
            Join ({humanPlayers}/{MAX_PLAYERS})
          </span>
        </a>
      )}

      {/* Dealer message */}
      {dealerMessage && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '1rem',
            fontSize: '1.1rem',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {dealerMessage}
        </div>
      )}

      {/* Bottom bar — player wallets with level badges */}
      {players && players.length > 0 && wallet && (
        <div style={bottomBarStyle}>
          {players.map((p) => (
            <FocusableHUDItem key={p.id} focusKey={`HUD_WALLET_${p.id}`} isRemote={isRemote}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.playerLevel != null && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#d4af37',
                      border: '1px solid #d4af37',
                      borderRadius: 8,
                      padding: '0 5px',
                      lineHeight: '1.4',
                    }}
                    data-testid={`level-badge-${p.id}`}
                  >
                    Lv.{p.playerLevel}
                  </span>
                )}
                <span>
                  {p.name || p.id.slice(0, 8)}:{' '}
                  <strong>${wallet[p.id]?.toLocaleString() ?? 0}</strong>
                </span>
              </span>
            </FocusableHUDItem>
          ))}
        </div>
      )}
    </div>
  )
}

/** Derive up to 3 challenge dots (bronze, silver, gold) from all players' summaries. */
function deriveChallengeIndicators(
  challengeSummary: Record<string, ChallengeSummary[]> | undefined,
): { tier: ChallengeTier; completed: boolean }[] {
  if (!challengeSummary) return []

  const tierOrder: ChallengeTier[] = ['bronze', 'silver', 'gold']
  const tierMap = new Map<ChallengeTier, boolean>()

  for (const summaries of Object.values(challengeSummary)) {
    for (const cs of summaries) {
      const existing = tierMap.get(cs.tier)
      // If any player has completed this tier, mark it completed
      if (existing === undefined) {
        tierMap.set(cs.tier, cs.completed)
      } else if (cs.completed) {
        tierMap.set(cs.tier, true)
      }
    }
  }

  if (tierMap.size === 0) return []

  return tierOrder
    .filter((t) => tierMap.has(t))
    .map((t) => ({ tier: t, completed: tierMap.get(t)! }))
}

function FocusableHUDItem({
  children,
  focusKey,
  isRemote,
}: {
  children: React.ReactNode
  focusKey: string
  isRemote: boolean
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    focusable: isRemote,
  })

  return (
    <div
      ref={ref}
      style={{
        borderRadius: 4,
        padding: '2px 6px',
        outline: focused ? focusOutline : 'none',
        boxShadow: focused ? focusShadow : 'none',
        transition: 'outline 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {children}
    </div>
  )
}
