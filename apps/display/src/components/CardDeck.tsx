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

    // Use gltf.nodes (flat lookup from drei) as primary source.
    // NOTE: drei's useGLTF preserves ORIGINAL node names with spaces (e.g. "Ace of Spades").
    // Three.js GLTFLoader does NOT always convert spaces to underscores — it depends on
    // the loader version and how nodes are accessed. We check BOTH patterns to be safe.
    const nodes = (gltf as any).nodes as Record<string, THREE.Object3D> | undefined
    if (nodes) {
      for (const [rawName, node] of Object.entries(nodes)) {
        // Match card groups: "Ace of Spades" (spaces) or "Ace_of_Spades" (underscores)
        const hasSpaceOf = rawName.includes(' of ')
        const hasUnderscoreOf = rawName.includes('_of_')
        if (!hasSpaceOf && !hasUnderscoreOf) continue

        // Skip leaf meshes (sub-parts like "Ace of Spades_01 - Default_0")
        // Card groups have a single suit word after " of " with no extra parts
        const separator = hasSpaceOf ? ' of ' : '_of_'
        const afterOf = rawName.split(separator)[1] ?? ''
        // Leaf meshes have underscores or " - " after the suit name
        if (afterOf.includes('_') || afterOf.includes(' - ')) continue

        // Normalise to canonical format: "Rank of Suit" (spaces)
        let name = rawName.replace(/_/g, ' ')
        if (name.includes('Eigh of')) name = name.replace('Eigh of', 'Eight of')
        map.set(name, node)
      }
    }

    // Fallback: traverse scene (same dual-pattern matching)
    if (map.size === 0) {
      scene.traverse((child) => {
        const hasSpaceOf = child.name.includes(' of ')
        const hasUnderscoreOf = child.name.includes('_of_')
        if (!hasSpaceOf && !hasUnderscoreOf) return
        if (child.children.length === 0) return
        const separator = hasSpaceOf ? ' of ' : '_of_'
        const afterOf = child.name.split(separator)[1] ?? ''
        if (afterOf.includes('_') || afterOf.includes(' - ')) return
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
