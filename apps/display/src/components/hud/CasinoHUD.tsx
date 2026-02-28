import { useState, useEffect } from 'react'
import { CASINO_GAME_LABELS } from '@weekend-casino/shared'
import type { CasinoGame } from '@weekend-casino/shared'
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useCurrentGame, useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import { useInputMode } from '../../platform/InputModeProvider.js'

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
  const { inputMode } = useInputMode()
  const isRemote = inputMode === 'remote'

  const { ref: hudRef } = useFocusable({
    focusKey: 'CASINO_HUD',
    trackChildren: true,
    focusable: isRemote,
  })

  const [sessionSeconds, setSessionSeconds] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Hide HUD in lobby
  if (!currentGame) return null

  const gameLabel = CASINO_GAME_LABELS[currentGame as CasinoGame] ?? currentGame

  return (
    <div ref={hudRef} style={overlayStyle} data-testid="casino-hud">
      {/* Top bar */}
      <div style={topBarStyle}>
        <FocusableHUDItem focusKey="HUD_GAME_LABEL" isRemote={isRemote}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>
            {gameLabel}
          </span>
        </FocusableHUDItem>
        <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>
          {formatSessionTime(sessionSeconds)}
        </span>
      </div>

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

      {/* Bottom bar — player wallets */}
      {players && players.length > 0 && wallet && (
        <div style={bottomBarStyle}>
          {players.map((p) => (
            <FocusableHUDItem key={p.id} focusKey={`HUD_WALLET_${p.id}`} isRemote={isRemote}>
              <span>
                {p.name || p.id.slice(0, 8)}:{' '}
                <strong>${wallet[p.id]?.toLocaleString() ?? 0}</strong>
              </span>
            </FocusableHUDItem>
          ))}
        </div>
      )}
    </div>
  )
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
