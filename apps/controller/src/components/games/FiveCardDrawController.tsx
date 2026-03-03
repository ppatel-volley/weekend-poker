import { useState, useCallback } from 'react'
import { useSessionMember } from '../../hooks/useVGFHooks.js'

/**
 * 5-Card Draw controller — card selection for discard + betting controls.
 *
 * Phase-driven button visibility:
 *   betting: FOLD, CHECK/CALL, RAISE, ALL IN (matches Hold'em pattern)
 *   discard: KEEP ALL CARDS, DRAW (with selected card count)
 */
export function FiveCardDrawController() {
  const member = useSessionMember()
  const playerName = (member?.state?.name as string) ?? 'Player'

  // Local state for discard selection (indices 0-4)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [phase] = useState<'betting' | 'discard'>('betting')

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

  const handleDiscard = useCallback(() => {
    // Will dispatch drawProcessDiscard thunk via VGF
    // For now, clear selection after confirming
    setSelectedIndices(new Set())
  }, [])

  const handleKeepAll = useCallback(() => {
    // Discard 0 cards — keep all
    setSelectedIndices(new Set())
  }, [])

  const isBetting = phase === 'betting'
  const isDiscard = phase === 'discard'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#1a1a2e',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '16px',
      }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>5-Card Draw</h2>
      <p style={{ textAlign: 'center', color: '#aaa', marginBottom: '16px', fontSize: '14px' }}>
        {isDiscard
          ? `${playerName}, tap cards to select for discard`
          : `${playerName}, place your bet`}
      </p>

      {/* Card hand — tappable cards (only interactive during discard) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '24px',
          flex: 1,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const isSelected = selectedIndices.has(i)
          return (
            <button
              key={i}
              onClick={() => isDiscard && toggleCard(i)}
              aria-label={`Card ${i + 1}${isSelected ? ' (selected for discard)' : ''}`}
              style={{
                width: '56px',
                height: '84px',
                borderRadius: '6px',
                background: isSelected ? '#3a1a1e' : '#2a2a3e',
                border: isSelected ? '2px solid #e74c3c' : '1px solid #444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: isSelected ? '#e74c3c' : '#fff',
                cursor: isDiscard ? 'pointer' : 'default',
                transform: isSelected ? 'translateY(-8px)' : 'none',
                transition: 'all 0.2s ease',
                opacity: isDiscard ? 1 : 0.6,
              }}
            >
              {isSelected ? 'X' : '?'}
            </button>
          )
        })}
      </div>

      {/* Discard info — only during discard phase */}
      {isDiscard && (
        <p style={{ textAlign: 'center', color: '#888', marginBottom: '16px', fontSize: '13px' }}>
          {selectedIndices.size === 0
            ? 'No cards selected'
            : `${selectedIndices.size} card${selectedIndices.size > 1 ? 's' : ''} selected for discard`}
        </p>
      )}

      {/* Action buttons — context-sensitive per phase */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {isDiscard && (
          <>
            <button
              onClick={handleDiscard}
              disabled={selectedIndices.size === 0}
              style={actionBtnStyle('#3498db', selectedIndices.size === 0)}
            >
              DRAW ({selectedIndices.size})
            </button>
            <button onClick={handleKeepAll} style={actionBtnStyle('#2ecc71')}>
              KEEP ALL CARDS
            </button>
          </>
        )}
        {isBetting && (
          <>
            <button style={actionBtnStyle('#e74c3c')}>FOLD</button>
            <button style={actionBtnStyle('#f39c12')}>CHECK</button>
            <button style={actionBtnStyle('#9b59b6')}>CALL</button>
            <button style={actionBtnStyle('#e91e63')}>ALL IN</button>
          </>
        )}
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
