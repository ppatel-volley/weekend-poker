import type { PokerPhase } from '@weekend-poker/shared'
import { useStateSyncSelector } from '../hooks/useVGFHooks.js'

/**
 * 2D HTML overlay for game information.
 *
 * Rendered on top of the 3D Canvas with pointer-events disabled so
 * that mouse/touch interactions pass through to the OrbitControls.
 *
 * TODO: Add dealer message display area
 * TODO: Add player action announcements
 * TODO: Add blind level indicator
 * TODO: Add hand number display
 */
export function HUD({ phase }: { phase: PokerPhase }) {
  const pot = useStateSyncSelector((s) => s.pot)
  const dealerMessage = useStateSyncSelector((s) => s.dealerMessage)
  const handNumber = useStateSyncSelector((s) => s.handNumber)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px',
        color: 'white',
        pointerEvents: 'none',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Top bar — phase and pot */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ opacity: 0.7, fontSize: '0.875rem' }}>
          Hand #{handNumber ?? 0} &middot; {phase}
        </span>
        <span style={{ fontWeight: 'bold' }}>Pot: ${pot ?? 0}</span>
      </div>

      {/* Dealer message — centred below top bar */}
      {dealerMessage && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '2rem',
            fontSize: '1.25rem',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {dealerMessage}
        </div>
      )}
    </div>
  )
}
