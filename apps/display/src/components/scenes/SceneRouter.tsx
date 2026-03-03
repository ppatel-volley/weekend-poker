import React, { Suspense } from 'react'
import { useCurrentGame, usePhase } from '../../hooks/useVGFHooks.js'
import { LobbyScene } from './LobbyScene.js'
import { SceneLoadingFallback } from './SceneLoadingFallback.js'
import type { CasinoGame } from '@weekend-casino/shared'

/** Lazy-loaded game scenes — split into separate chunks for smaller initial bundle. */
const HoldemScene = React.lazy(() =>
  import('./HoldemScene.js').then(m => ({ default: m.HoldemScene })),
)
const FiveCardDrawScene = React.lazy(() =>
  import('./FiveCardDrawScene.js').then(m => ({ default: m.FiveCardDrawScene })),
)
const BlackjackScene = React.lazy(() =>
  import('./BlackjackScene.js').then(m => ({ default: m.BlackjackScene })),
)
const CompetitiveBlackjackScene = React.lazy(() =>
  import('./CompetitiveBlackjackScene.js').then(m => ({ default: m.CompetitiveBlackjackScene })),
)
const ThreeCardPokerScene = React.lazy(() =>
  import('./ThreeCardPokerScene.js').then(m => ({ default: m.ThreeCardPokerScene })),
)
const RouletteScene = React.lazy(() =>
  import('./RouletteScene.js').then(m => ({ default: m.RouletteScene })),
)
const GameNightLeaderboardScene = React.lazy(() =>
  import('./GameNightLeaderboardScene.js').then(m => ({ default: m.GameNightLeaderboardScene })),
)
const GameNightChampionScene = React.lazy(() =>
  import('./GameNightChampionScene.js').then(m => ({ default: m.GameNightChampionScene })),
)

/** Maps CasinoGame to its scene component. */
const SCENE_MAP: Record<CasinoGame, React.ComponentType> = {
  holdem: HoldemScene,
  five_card_draw: FiveCardDrawScene,
  blackjack_classic: BlackjackScene,
  blackjack_competitive: CompetitiveBlackjackScene,
  roulette: RouletteScene,
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

  // Game Night overlay phases — 2D HTML, not 3D R3F scenes.
  // Primary routing lives in DisplayRouter (App.tsx); these are here
  // for completeness if SceneRouter is used outside a Canvas context.
  if (phase === 'GN_LEADERBOARD') {
    return (
      <Suspense fallback={<SceneLoadingFallback />}>
        <GameNightLeaderboardScene />
      </Suspense>
    )
  }
  if (phase === 'GN_CHAMPION') {
    return (
      <Suspense fallback={<SceneLoadingFallback />}>
        <GameNightChampionScene />
      </Suspense>
    )
  }

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
