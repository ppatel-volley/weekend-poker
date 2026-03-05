/**
 * Card deck provider for controller — loads the GLB and provides card clones.
 * Adapted from display's CardDeck.tsx for use inside the controller's R3F Canvas.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Card } from '@weekend-casino/shared'
import { buildCardMeshMap, cardToMeshName } from '../../utils/cardUtils.js'

export interface CardDeckContextValue {
  meshMap: Map<string, THREE.Object3D>
  getCardClone: (card: Card) => THREE.Object3D | null
  ready: boolean
}

const CardDeckContext = createContext<CardDeckContextValue | null>(null)

export function useCardDeck(): CardDeckContextValue {
  const ctx = useContext(CardDeckContext)
  if (!ctx) throw new Error('useCardDeck must be used within <CardDeckProvider>')
  return ctx
}

const DECK_GLB_PATH = '/52-card_deck.glb'

export function CardDeckProvider({ children }: { children: React.ReactNode }) {
  const gltf = useGLTF(DECK_GLB_PATH)
  const scene = gltf.scene
  const meshMapRef = useRef<Map<string, THREE.Object3D>>(new Map())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const map = new Map<string, THREE.Object3D>()
    const TYPO = 'Eigh of'
    const FIX = 'Eight of'

    // Three.js GLTFLoader normalises spaces to underscores in node names.
    // GLB has "Ace of Spades" but Three.js creates "Ace_of_Spades".
    const nodes = (gltf as any).nodes as Record<string, THREE.Object3D> | undefined
    if (nodes) {
      for (const [rawName, node] of Object.entries(nodes)) {
        if (!rawName.includes('_of_')) continue
        const afterOf = rawName.split('_of_')[1] ?? ''
        if (afterOf.includes('_')) continue
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

    for (const group of map.values()) {
      group.visible = false
    }
    meshMapRef.current = map
    setReady(true)
  }, [scene, gltf])

  const value = useMemo<CardDeckContextValue>(() => {
    const getCardClone = (card: Card): THREE.Object3D | null => {
      const name = cardToMeshName(card)
      const source = meshMapRef.current.get(name)
      if (!source) return null
      const clone = source.clone(true)
      clone.visible = true
      clone.traverse((child) => { child.visible = true })
      return clone
    }

    return {
      get meshMap() { return meshMapRef.current },
      getCardClone,
      ready,
    }
  }, [ready])

  return (
    <CardDeckContext value={value}>
      <primitive object={scene} visible={false} />
      {children}
    </CardDeckContext>
  )
}

useGLTF.preload(DECK_GLB_PATH)
