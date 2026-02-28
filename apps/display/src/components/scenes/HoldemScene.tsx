import { Suspense } from 'react'
import { PokerTable } from '../PokerTable.js'
import { Lighting } from '../Lighting.js'
import { CameraRig } from '../CameraRig.js'
import { PostProcessing } from '../PostProcessing.js'
import { CardDeckProvider } from '../CardDeck.js'
import { CommunityCards } from '../CommunityCards.js'
import { PlayerSeats } from '../PlayerSeats.js'
import { PotDisplay } from '../PotDisplay.js'
import { DealerSpeechBubble } from '../DealerSpeechBubble.js'
import { usePhase } from '../../hooks/useVGFHooks.js'
import type { CasinoPhase } from '@weekend-casino/shared'

/**
 * Hold'em scene — "The Vault".
 * Wraps existing Hold'em components in a scene group.
 * Phase is read from VGF state and passed to CameraRig.
 */
export function HoldemScene() {
  const phase = usePhase()

  return (
    <group>
      <Lighting />
      <CameraRig phase={phase as CasinoPhase} />

      <CardDeckProvider>
        <PokerTable />
        <CommunityCards />
        <PlayerSeats />
        <PotDisplay />
        <DealerSpeechBubble />
      </CardDeckProvider>

      <PostProcessing />
    </group>
  )
}
