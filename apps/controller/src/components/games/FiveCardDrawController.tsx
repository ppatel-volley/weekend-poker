import { useSessionMember } from '../../hooks/useVGFHooks.js'

/**
 * 5-Card Draw controller — draw/discard card selection + bet controls.
 * Placeholder until full game implementation.
 */
export function FiveCardDrawController() {
  const member = useSessionMember()
  const playerName = member?.displayName ?? 'Player'

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
      <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>5-Card Draw</h2>
      <p style={{ textAlign: 'center', color: '#aaa', marginBottom: '24px' }}>
        {playerName}, select cards to discard
      </p>

      {/* Card placeholders */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '32px',
          flex: 1,
          alignItems: 'center',
        }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              width: '56px',
              height: '84px',
              borderRadius: '6px',
              background: '#2a2a3e',
              border: '1px solid #444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            ?
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button style={actionBtnStyle('#e74c3c')}>FOLD</button>
        <button style={actionBtnStyle('#3498db')}>DRAW</button>
        <button style={actionBtnStyle('#f39c12')}>BET</button>
        <button style={actionBtnStyle('#e91e63')}>ALL IN</button>
      </div>
    </div>
  )
}

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '16px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    background: bg,
    color: 'white',
  }
}
