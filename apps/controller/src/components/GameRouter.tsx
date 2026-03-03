import { CasinoPhase } from '@weekend-casino/shared'
import type { CasinoGame } from '@weekend-casino/shared'
import { usePhase, useStateSync } from '../hooks/useVGFHooks.js'
import { LobbyController } from './games/LobbyController.js'
import { HoldemController } from './games/HoldemController.js'
import { FiveCardDrawController } from './games/FiveCardDrawController.js'
import { BlackjackController } from './games/BlackjackController.js'
import { CompetitiveBlackjackController } from './games/CompetitiveBlackjackController.js'
import { ThreeCardPokerController } from './games/ThreeCardPokerController.js'
import { RouletteController } from './games/RouletteController.js'
import { GameNightSetupController } from './games/GameNightSetupController.js'
import { GameNightLeaderboardController } from './games/GameNightLeaderboardController.js'
import { GameNightChampionController } from './games/GameNightChampionController.js'

/**
 * Derives the active game from the current phase when selectedGame is null.
 * Hold'em phases are unprefixed; other games use prefixed phase names.
 */
function deriveGameFromPhase(phase: CasinoPhase): CasinoGame | null {
  const phaseStr = phase as string
  if (phaseStr.startsWith('DRAW_')) return 'five_card_draw'
  if (phaseStr.startsWith('BJC_')) return 'blackjack_competitive'
  if (phaseStr.startsWith('BJ_')) return 'blackjack_classic'
  if (phaseStr.startsWith('ROULETTE_')) return 'roulette'
  if (phaseStr.startsWith('TCP_')) return 'three_card_poker'
  if (phaseStr.startsWith('CRAPS_')) return 'craps'
  // Unprefixed gameplay phases are Hold'em
  if (phase !== CasinoPhase.Lobby && phase !== CasinoPhase.GameSelect) {
    return 'holdem'
  }
  return null
}

/**
 * Game-adaptive controller router.
 *
 * Reads the current game from state (selectedGame or derived from phase)
 * and renders the appropriate game controller layout.
 */
export function GameRouter() {
  const phase = usePhase()
  const state = useStateSync()

  if (!phase) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '40vh', color: 'white' }}>
        <p>Connecting to game...</p>
      </div>
    )
  }

  // Game Night phases — route before lobby check
  if (phase === CasinoPhase.GnSetup) {
    return <GameNightSetupController />
  }
  if (phase === CasinoPhase.GnLeaderboard) {
    return <GameNightLeaderboardController />
  }
  if (phase === CasinoPhase.GnChampion) {
    return <GameNightChampionController />
  }

  if (phase === CasinoPhase.Lobby || phase === CasinoPhase.GameSelect) {
    return <LobbyController />
  }

  const currentGame = state?.selectedGame ?? deriveGameFromPhase(phase)

  switch (currentGame) {
    case 'holdem':
      return <HoldemController />
    case 'five_card_draw':
      return <FiveCardDrawController />
    case 'blackjack_classic':
      return <BlackjackController />
    case 'blackjack_competitive':
      return <CompetitiveBlackjackController />
    case 'three_card_poker':
      return <ThreeCardPokerController />
    case 'roulette':
      return <RouletteController />
    default:
      return (
        <div style={{ textAlign: 'center', paddingTop: '40vh', color: 'white' }}>
          <p>Game loading...</p>
        </div>
      )
  }
}
