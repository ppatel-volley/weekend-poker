import { Suspense } from 'react'
import { useCurrentGame, usePhase } from '../../hooks/useVGFHooks.js'
import { LobbyScene } from './LobbyScene.js'
import { HoldemScene } from './HoldemScene.js'
import { FiveCardDrawScene } from './FiveCardDrawScene.js'
import { BlackjackScene } from './BlackjackScene.js'
import { CompetitiveBlackjackScene } from './CompetitiveBlackjackScene.js'
import { ThreeCardPokerScene } from './ThreeCardPokerScene.js'
import { SceneLoadingFallback } from './SceneLoadingFallback.js'
import type { CasinoGame } from '@weekend-casino/shared'

/** Maps CasinoGame to its scene component. */
const SCENE_MAP: Record<CasinoGame, React.ComponentType> = {
  holdem: HoldemScene,
  five_card_draw: FiveCardDrawScene,
  blackjack_classic: BlackjackScene,
  blackjack_competitive: CompetitiveBlackjackScene,
  roulette: FiveCardDrawScene,       // reuse placeholder until Roulette scene built
  three_card_poker: ThreeCardPokerScene,
  craps: FiveCardDrawScene,          // reuse placeholder until Craps scene built
}

/**
 * Multi-game scene router for the Display client.
 *
 * Reads selectedGame from VGF state (or derives from phase prefix) and
 * renders the appropriate 3D scene inside a Suspense boundary.
 * Falls through to LobbyScene when no game is active.
 */
export function SceneRouter() {
  const currentGame = useCurrentGame()
  const phase = usePhase()

  const isLobby =
    !phase ||
    phase === 'LOBBY' ||
    phase === 'GAME_SELECT' ||
    phase === 'GN_SETUP'

  if (isLobby || !currentGame) {
    return <LobbyScene />
  }

  const SceneComponent = SCENE_MAP[currentGame]

  if (!SceneComponent) {
    return <LobbyScene />
  }

  return (
    <Suspense fallback={<SceneLoadingFallback />}>
      <SceneComponent />
    </Suspense>
  )
}
