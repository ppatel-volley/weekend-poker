import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Card } from '@weekend-casino/shared'
import { cardToMeshName } from '../utils/cardUtils.js'

// ── Context ──────────────────────────────────────────────────

export interface CardDeckContextValue {
  /** Normalised name -> source THREE.Group from the GLB. */
  meshMap: Map<string, THREE.Object3D>
  /** Toggle visibility on a card group by its canonical name. */
  setCardVisibility: (cardName: string, visible: boolean) => void
  /** Return a *clone* of the card group for independent placement. */
  getCardClone: (card: Card) => THREE.Object3D | null
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
  const gltf = useGLTF(DECK_GLB_PATH)
  const scene = gltf.scene
  const meshMapRef = useRef<Map<string, THREE.Object3D>>(new Map())
  const [ready, setReady] = useState(false)

  // Build the mesh map once on first load.
  // Use gltf.nodes (flat lookup of all named nodes) as primary source,
  // falling back to scene traversal if nodes isn't available.
  useEffect(() => {
    const map = new Map<string, THREE.Object3D>()

    // Use gltf.nodes (flat lookup from drei) as primary source
    const nodes = (gltf as any).nodes as Record<string, THREE.Object3D> | undefined
    if (nodes) {
      for (const [rawName, node] of Object.entries(nodes)) {
        if (!rawName.includes('_of_')) continue
        // Skip leaf meshes (e.g. "Ace_of_Spades_01_-_Default_0") — they have more than one _ segment after _of_
        // Card groups: "Ace_of_Spades" (3 parts). Meshes: "Ace_of_Spades_01_-_Default_0" (many parts)
        const afterOf = rawName.split('_of_')[1] ?? ''
        if (afterOf.includes('_')) continue
        // Normalise name back to spaces for lookup by cardToMeshName
        let name = rawName.replace(/_/g, ' ')
        if (name.includes('Eigh of')) name = name.replace('Eigh of', 'Eight of')
        map.set(name, node)
      }
    }

    // Fallback: traverse scene
    if (map.size === 0) {
      scene.traverse((child) => {
        if (!child.name.includes('_of_')) return
        if (child.children.length === 0) return
        const afterOf = child.name.split('_of_')[1] ?? ''
        if (afterOf.includes('_')) return
        let name = child.name.replace(/_/g, ' ')
        if (name.includes('Eigh of')) name = name.replace('Eigh of', 'Eight of')
        map.set(name, child)
      })
    }

    // Hide every card by default.
    for (const group of map.values()) {
      group.visible = false
    }

    meshMapRef.current = map
    setReady(true)
  }, [scene, gltf])

  // Rebuild context value when ready flips — this triggers consumer re-renders
  // so CardModel components re-call getCardClone with a populated mesh map.
  const value = useMemo<CardDeckContextValue>(() => {
    const setCardVisibility = (cardName: string, visible: boolean) => {
      const group = meshMapRef.current.get(cardName)
      if (group) {
        group.visible = visible
      }
    }

    const getCardClone = (card: Card): THREE.Object3D | null => {
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
