import { PokerPhase } from '@weekend-poker/shared'
import { usePhase } from '../hooks/useVGFHooks.js'
import { LobbyView } from './LobbyView.js'
import { GameView2D } from './GameView2D.js'

/**
 * Routes the display to the correct view based on the current game phase.
 *
 * Uses a 2D fallback game view until R3F is upgraded to v9 for React 19 support.
 */
export function PhaseRouter() {
  const phase = usePhase()

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
        <p>Connecting...</p>
      </div>
    )
  }

  if (phase === PokerPhase.Lobby) {
    return <LobbyView />
  }

  return <GameView2D />
}
