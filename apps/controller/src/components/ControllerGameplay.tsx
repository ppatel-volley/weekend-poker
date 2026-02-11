import type { PokerPhase } from '@weekend-poker/shared'
import { BETTING_PHASES } from '@weekend-poker/shared'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition.js'

/**
 * Main gameplay controller screen.
 *
 * Shows hole cards, action buttons during betting phases,
 * and a push-to-talk button for voice commands.
 */
export function ControllerGameplay({ phase }: { phase: PokerPhase }) {
  const isBettingPhase = (BETTING_PHASES as readonly string[]).includes(phase)
  const { status, pendingTranscript, finalTranscript, startRecording, stopRecording } = useVoiceRecognition()

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
      {/* Game info bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <span>Phase: {phase}</span>
        {/* TODO: Pull actual stack from game state */}
        <span>Stack: $1,000</span>
      </div>

      {/* Hole cards */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '24px',
          flex: 1,
          alignItems: 'center',
        }}
      >
        {/* TODO: Replace placeholders with actual card rendering */}
        <div style={holeCardStyle}>?</div>
        <div style={holeCardStyle}>?</div>
      </div>

      {/* Action buttons — only shown during betting phases */}
      {isBettingPhase && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {/* TODO: Wire up dispatch for each action */}
          <button style={actionButtonStyle('#e74c3c')}>FOLD</button>
          <button style={actionButtonStyle('#3498db')}>CHECK</button>
          <button style={actionButtonStyle('#f39c12')}>RAISE</button>
          <button style={actionButtonStyle('#e91e63')}>ALL IN</button>
        </div>
      )}

      {/* TODO: Bet slider for raise amounts */}

      {/* Push-to-talk — uses touch events for mobile, mouse for desktop */}
      <button
        style={{
          width: '100%',
          padding: '20px',
          fontSize: '18px',
          borderRadius: '12px',
          border: status === 'recording' ? '2px solid #e74c3c' : '2px solid #666',
          background: '#333',
          color: 'white',
          cursor: 'pointer',
          touchAction: 'none',
        }}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
      >
        {status === 'recording'
          ? pendingTranscript || 'Listening...'
          : status === 'processing'
            ? 'Processing...'
            : status === 'complete'
              ? finalTranscript || 'Hold to Talk'
              : 'Hold to Talk'}
      </button>
    </div>
  )
}

const holeCardStyle: React.CSSProperties = {
  width: '80px',
  height: '120px',
  borderRadius: '8px',
  background: '#2a2a3e',
  border: '2px solid #444',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
}

function actionButtonStyle(bg: string): React.CSSProperties {
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
