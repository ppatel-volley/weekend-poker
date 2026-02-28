/**
 * Three Card Poker controller — Ante/Play/Fold buttons.
 * Placeholder until full game implementation.
 */
export function ThreeCardPokerController() {
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
      <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>Three Card Poker</h2>

      {/* Hand display placeholder */}
      <div
        style={{
          textAlign: 'center',
          padding: '32px',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#aaa',
        }}
      >
        Place your ante to begin
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <button style={actionBtnStyle('#f39c12')}>ANTE</button>
        <button style={actionBtnStyle('#2ecc71')}>PLAY</button>
        <button style={actionBtnStyle('#e74c3c')}>FOLD</button>
      </div>
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
