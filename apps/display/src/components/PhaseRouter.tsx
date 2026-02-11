import { lazy, Suspense } from 'react'
import { PokerPhase } from '@weekend-poker/shared'
import { usePhase } from '../hooks/useVGFHooks.js'
import { LobbyView } from './LobbyView.js'

// Lazy-load GameView so R3F's react-reconciler doesn't initialise
// until we actually leave the lobby (avoids React 19 crash on load).
const GameView = lazy(() =>
  import('./GameView.js').then((m) => ({ default: m.GameView })),
)

/**
 * Routes the display to the correct view based on the current game phase.
 *
 * While the VGF connection is being established (phase is null/undefined),
 * a simple "Connecting..." splash is shown.
 */
export function PhaseRouter() {
  const phase = usePhase()

  // Debug: remove once lobby is working
  console.log('[PhaseRouter] phase:', phase, typeof phase)

  if (!phase) {
    return (
      <div
        style={{
          color: 'white',
          textAlign: 'center',
          paddingTop: '40vh',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1>Weekend Poker</h1>
        <p>Connecting... (phase: {JSON.stringify(phase)})</p>
      </div>
    )
  }

  switch (phase) {
    case PokerPhase.Lobby:
      return <LobbyView />
    default:
      return (
        <Suspense fallback={<div style={{ color: 'white', textAlign: 'center', paddingTop: '40vh' }}>Loading...</div>}>
          <GameView phase={phase} />
        </Suspense>
      )
  }
}
