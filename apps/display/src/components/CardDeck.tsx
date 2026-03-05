import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Card } from '@weekend-casino/shared'
import { buildCardMeshMap, cardToMeshName } from '../utils/cardUtils.js'

// ── Context ──────────────────────────────────────────────────

export interface CardDeckContextValue {
  /** Normalised name -> source THREE.Group from the GLB. */
  meshMap: Map<string, THREE.Group>
  /** Toggle visibility on a card group by its canonical name. */
  setCardVisibility: (cardName: string, visible: boolean) => void
  /** Return a *clone* of the card group for independent placement. */
  getCardClone: (card: Card) => THREE.Group | null
  /** True once the GLB mesh map is populated and cards can be cloned. */
  ready: boolean
}

const CardDeckContext = createContext<CardDeckContextValue | null>(null)

/**
 * Access the card deck context.
 * Must be rendered inside a <CardDeckProvider>.
 */
export function useCardDeck(): CardDeckContextValue {
  const ctx = useContext(CardDeckContext)
  if (!ctx) {
    throw new Error('useCardDeck must be used within a <CardDeckProvider>')
  }
  return ctx
}

// ── GLB path (served from /public) ───────────────────────────

const DECK_GLB_PATH = '/52-card_deck.glb'

// ── Provider component ───────────────────────────────────────

/**
 * Loads the 52-card deck GLB, builds a mesh lookup map, and
 * provides card instances to descendants via context.
 *
 * On load every card group is hidden (visible = false).
 * Consumers call setCardVisibility or getCardClone to use cards.
 */
export function CardDeckProvider({ children }: { children: React.ReactNode }) {
  const { scene } = useGLTF(DECK_GLB_PATH)
  const meshMapRef = useRef<Map<string, THREE.Group>>(new Map())
  const [ready, setReady] = useState(false)

  // Build the mesh map once on first load.
  useEffect(() => {
    const map = buildCardMeshMap(scene)

    // Hide every card by default.
    for (const group of map.values()) {
      group.visible = false
    }

    meshMapRef.current = map
    setReady(true)
  }, [scene])

  // Rebuild context value when ready flips — this triggers consumer re-renders
  // so CardModel components re-call getCardClone with a populated mesh map.
  const value = useMemo<CardDeckContextValue>(() => {
    const setCardVisibility = (cardName: string, visible: boolean) => {
      const group = meshMapRef.current.get(cardName)
      if (group) {
        group.visible = visible
      }
    }

    const getCardClone = (card: Card): THREE.Group | null => {
      const name = cardToMeshName(card)
      const source = meshMapRef.current.get(name)
      if (!source) return null
      const clone = source.clone(true)
      // Source cards are hidden (visible=false) to keep textures in GPU memory
      // without rendering. Clones must be made visible for actual display.
      clone.visible = true
      clone.traverse((child) => { child.visible = true })
      return clone
    }

    return {
      get meshMap() { return meshMapRef.current },
      setCardVisibility,
      getCardClone,
      ready,
    }
  }, [ready])

  return (
    <CardDeckContext value={value}>
      {/* Render the deck scene (hidden cards) so Three.js keeps textures in GPU memory. */}
      <primitive object={scene} visible={false} />
      {children}
    </CardDeckContext>
  )
}

// Preload the GLB so it starts downloading before the component mounts.
useGLTF.preload(DECK_GLB_PATH)
