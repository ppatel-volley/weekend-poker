import { useVoice } from '../../hooks/useVoice.js'

/**
 * Push-to-talk button for voice commands.
 * Large touch target for mobile use, no hover states.
 */
export function VoiceButton() {
  const { isListening, transcript, startListening, stopListening, error } = useVoice()

  const label = error
    ? 'Voice unavailable'
    : isListening
      ? transcript || 'Listening...'
      : 'Hold to Talk'

  return (
    <button
      data-testid="voice-button"
      style={{
        width: '100%',
        padding: '20px',
        fontSize: '18px',
        borderRadius: '12px',
        border: isListening ? '2px solid #e74c3c' : '2px solid #666',
        background: error ? '#555' : '#333',
        color: 'white',
        cursor: error ? 'not-allowed' : 'pointer',
        touchAction: 'none',
        opacity: error ? 0.6 : 1,
      }}
      onMouseDown={error ? undefined : startListening}
      onMouseUp={error ? undefined : stopListening}
      onTouchStart={error ? undefined : startListening}
      onTouchEnd={error ? undefined : stopListening}
      disabled={!!error}
    >
      {label}
    </button>
  )
}
