import { useState, useEffect } from 'react'
import type { Card } from '@weekend-casino/shared'
import { cardToMeshName } from '../utils/cardUtils.js'
import { loadCardTextures } from '../utils/cardTextureExtractor.js'

/** Shared singleton for the loaded texture map (lazy — only starts on first mount). */
let cachedTextureMap: Map<string, string> | null = null
let texturePromise: Promise<Map<string, string>> | null = null

function getTexturePromise(): Promise<Map<string, string>> {
  if (!texturePromise) {
    texturePromise = loadCardTextures().then((map) => {
      cachedTextureMap = map
      return map
    })
  }
  return texturePromise
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
}

const RED_SUITS = new Set(['hearts', 'diamonds'])

/** Width/height ratio for cards (256:512 = 1:2). */
const CARD_ASPECT = 0.5

export interface CardImageProps {
  card: Card
  height?: number
  faceDown?: boolean
}

/**
 * Renders a playing card as an `<img>` using textures extracted from
 * the GLB deck file. Falls back to a text representation while the
 * textures are loading.
 */
export function CardImage({ card, height = 100, faceDown = false }: CardImageProps) {
  const [textureMap, setTextureMap] = useState<Map<string, string> | null>(
    cachedTextureMap,
  )

  useEffect(() => {
    if (cachedTextureMap) return
    let cancelled = false
    getTexturePromise().then((map) => {
      if (!cancelled) setTextureMap(map)
    })
    return () => { cancelled = true }
  }, [])

  const width = height * CARD_ASPECT

  if (faceDown) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #1e3a5f 25%, #14284a 75%)',
          border: '2px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: width * 0.7,
            height: height * 0.85,
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)',
          }}
        />
      </div>
    )
  }

  const meshName = cardToMeshName(card)
  const dataUrl = textureMap?.get(meshName)

  if (!dataUrl) {
    // Text fallback while loading or if texture not found
    const colour = RED_SUITS.has(card.suit) ? '#ef4444' : 'white'
    return (
      <div
        style={{
          width,
          height,
          borderRadius: 6,
          background: '#1a1a2e',
          border: '2px solid rgba(255,255,255,0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: colour,
          fontSize: height * 0.2,
          fontWeight: 700,
          gap: 2,
        }}
      >
        <span>{card.rank}</span>
        <span style={{ fontSize: height * 0.25 }}>{SUIT_SYMBOLS[card.suit]}</span>
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt={meshName}
      style={{
        width,
        height,
        borderRadius: 6,
        objectFit: 'cover',
        border: '2px solid rgba(255,255,255,0.2)',
      }}
    />
  )
}
