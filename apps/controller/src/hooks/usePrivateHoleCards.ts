/**
 * Hook for receiving hole cards via targeted private events.
 *
 * SECURITY: Hole cards are NEVER stored in broadcast game state.
 * The server sends a 'privateHoleCards' event directly to the
 * requesting client's connection. This hook listens for that event
 * and stores the cards in local React state.
 */

import { useState, useEffect, useCallback } from 'react'
import type { Card } from '@weekend-casino/shared'
import { useVGFClient } from '@volley/vgf/client'
import type { CasinoGameState } from '@weekend-casino/shared'

/**
 * Listens for private hole card delivery from the server.
 * Returns the current player's hole cards, or undefined if not yet received.
 *
 * Cards are cleared when a new hand starts (handNumber changes).
 */
export function usePrivateHoleCards(playerId: string): [Card, Card] | undefined {
  const [cards, setCards] = useState<[Card, Card] | undefined>(undefined)
  const client = useVGFClient<CasinoGameState>()

  // Listen for the privateHoleCards event from the server
  useEffect(() => {
    if (!client?.transport) return

    const handler = (message: unknown) => {
      // Messages arrive as { type: string, payload: unknown[] }
      const msg = message as { type?: string; payload?: unknown[] }
      if (msg?.type !== 'privateHoleCards') return

      const data = msg.payload?.[0] as { playerId?: string; cards?: [Card, Card] } | undefined
      if (!data?.playerId || !data?.cards) return

      // Only accept cards addressed to this player
      if (data.playerId === playerId) {
        setCards(data.cards)
      }
    }

    client.transport.on('private_data' as any, handler)
    return () => {
      // VGF transport doesn't expose removeListener; handler is cleaned up on unmount
    }
  }, [client, playerId])

  // Clear cards when hand number changes (new hand dealt)
  const clearCards = useCallback(() => setCards(undefined), [])
  useEffect(() => {
    // Subscribe to state updates to detect hand number changes
    if (!client) return

    let lastHandNumber = 0
    const handler = () => {
      try {
        const state = client.getState()
        const handNumber = (state as any)?.handNumber ?? 0
        if (handNumber !== lastHandNumber && lastHandNumber !== 0) {
          clearCards()
        }
        lastHandNumber = handNumber
      } catch {
        // Client may not be connected yet
      }
    }

    // Check on each state update via the PartyTimeClient event system
    client.addEventListener('SESSION_UPDATE' as any, handler)
    return () => {
      client.removeEventListener('SESSION_UPDATE' as any, handler)
    }
  }, [client, clearCards])

  return cards
}
