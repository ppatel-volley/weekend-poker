import { useState, useEffect } from 'react'

const AUTO_DISMISS_MS = 5000

export interface BonusPopupProps {
  amount: number
  streakDay: number
  multiplierApplied: boolean
  onDismiss: () => void
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 100,
  pointerEvents: 'auto',
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(20, 15, 10, 0.92)',
  border: '2px solid #d4af37',
  borderRadius: 16,
  padding: '20px 36px',
  textAlign: 'center' as const,
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  boxShadow: '0 8px 32px rgba(212, 175, 55, 0.35)',
  minWidth: 260,
  animation: 'bonusSlideDown 0.4s ease-out forwards',
}

const headerStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#d4af37',
  marginBottom: 8,
  letterSpacing: '0.04em',
}

const amountStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 800,
  color: '#fff',
  margin: '4px 0',
}

const streakStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'rgba(255, 255, 255, 0.7)',
  marginTop: 6,
}

const multiplierBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'linear-gradient(135deg, #d4af37, #f5d76e)',
  color: '#1a1408',
  fontWeight: 700,
  fontSize: '0.75rem',
  padding: '2px 10px',
  borderRadius: 12,
  marginTop: 8,
}

/**
 * Daily bonus popup overlay — slides down from top, auto-dismisses after 5s.
 */
export function BonusPopup({ amount, streakDay, multiplierApplied, onDismiss }: BonusPopupProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  if (!visible) return null

  return (
    <div style={containerStyle} data-testid="bonus-popup">
      {/* Inline keyframes for slide-down animation */}
      <style>{`
        @keyframes bonusSlideDown {
          from { opacity: 0; transform: translateY(-60px); }
          to   { opacity: 1; transform: translateY(16px); }
        }
      `}</style>
      <div style={cardStyle}>
        <div style={headerStyle}>Daily Bonus!</div>
        <div style={amountStyle}>
          <span role="img" aria-label="coins">&#x1FA99;</span>{' '}
          {amount.toLocaleString()} chips
        </div>
        <div style={streakStyle}>
          Day {streakDay} streak
        </div>
        {multiplierApplied && (
          <div style={multiplierBadgeStyle} data-testid="multiplier-badge">
            Streak Multiplier
          </div>
        )}
      </div>
    </div>
  )
}
