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
  meshMap: Map<string, THREE.Group>
  getCardClone: (card: Card) => THREE.Group | null
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
  const { scene } = useGLTF(DECK_GLB_PATH)
  const meshMapRef = useRef<Map<string, THREE.Group>>(new Map())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const map = buildCardMeshMap(scene)
    for (const group of map.values()) {
      group.visible = false
    }
    meshMapRef.current = map
    setReady(true)
  }, [scene])

  const value = useMemo<CardDeckContextValue>(() => {
    const getCardClone = (card: Card): THREE.Group | null => {
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
