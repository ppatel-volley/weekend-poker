import { useVoice } from '../../hooks/useVoice.js'
import { usePhase } from '../../hooks/useVGFHooks.js'

const VOICE_HINTS: Record<string, string> = {
  // Hold'em / Draw betting
  HOLDEM_PREFLOP: "Try: 'fold', 'check', 'raise fifty'",
  HOLDEM_FLOP: "Try: 'fold', 'check', 'raise fifty'",
  HOLDEM_TURN: "Try: 'fold', 'check', 'raise fifty'",
  HOLDEM_RIVER: "Try: 'fold', 'check', 'raise fifty'",
  DRAW_BETTING_1: "Try: 'fold', 'check', 'raise fifty'",
  DRAW_BETTING_2: "Try: 'fold', 'check', 'raise fifty'",
  DRAW_DRAW_PHASE: "Try: 'stand pat', 'discard'",
  // Blackjack
  BJ_PLACE_BETS: "Try: 'bet fifty'",
  BJ_INSURANCE: "Try: 'insurance', 'even money'",
  BJ_PLAYER_TURNS: "Try: 'hit', 'stand', 'double down'",
  BJC_PLAYER_TURNS: "Try: 'hit', 'stand', 'double'",
  // TCP
  TCP_PLACE_BETS: "Try: 'ante up'",
  TCP_PLAYER_DECISIONS: "Try: 'play', 'fold'",
  // Roulette
  ROULETTE_PLACE_BETS: "Try: 'red', 'black', 'number 17'",
  // Craps
  CRAPS_COME_OUT_BETTING: "Try: 'pass line', 'don't pass'",
  CRAPS_POINT_BETTING: "Try: 'place six', 'come bet'",
}

/**
 * Push-to-talk button for voice commands.
 * Large touch target for mobile use, no hover states.
 */
export function VoiceButton() {
  const { isListening, transcript, startListening, stopListening, error } = useVoice()
  const phase = usePhase()

  const label = error
    ? 'Voice unavailable'
    : isListening
      ? transcript || 'Listening...'
      : 'Hold to Talk'

  const hint = phase ? VOICE_HINTS[phase] : undefined

  return (
    <div>
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
      {hint && !isListening && !error && (
        <div
          data-testid="voice-hint"
          style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#999',
            marginTop: '6px',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
