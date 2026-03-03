import { ControllerGameplay } from '../ControllerGameplay.js'
import { usePhase } from '../../hooks/useVGFHooks.js'

/**
 * Hold'em controller — wraps the existing ControllerGameplay component.
 */
export function HoldemController() {
  const phase = usePhase()
  return <ControllerGameplay phase={phase} />
}
