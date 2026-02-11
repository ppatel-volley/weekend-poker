import { PokerPhase } from '@weekend-poker/shared'
import { usePhase } from '../hooks/useVGFHooks.js'
import { ControllerLobby } from './ControllerLobby.js'
import { ControllerGameplay } from './ControllerGameplay.js'

/**
 * Routes the controller to the correct view based on the current game phase.
 *
 * Whilst the VGF connection is being established (phase is null/undefined),
 * a simple "Connecting..." message is shown.
 */
export function ControllerPhaseRouter() {
  const phase = usePhase()

  if (!phase) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '40vh', color: 'white' }}>
        <p>Connecting to game...</p>
      </div>
    )
  }

  switch (phase) {
    case PokerPhase.Lobby:
      return <ControllerLobby />
    default:
      return <ControllerGameplay phase={phase} />
  }
}
