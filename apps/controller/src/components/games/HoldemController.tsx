import { ControllerGameplay } from '../ControllerGameplay.js'
import { usePhase } from '../../hooks/useVGFHooks.js'
import type { PokerPhase } from '@weekend-casino/shared'

/**
 * Hold'em controller — wraps the existing ControllerGameplay component.
 */
export function HoldemController() {
  const phase = usePhase() as PokerPhase
  return <ControllerGameplay phase={phase} />
}
