/**
 * Shared 2D card display components for the controller.
 * Pure CSS/HTML — no WebGL, no GLB files, works everywhere.
 */

import type { Card } from '@weekend-casino/shared'

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
}

const SUIT_COLOURS: Record<string, string> = {
  spades: '#1a1a2e',
  hearts: '#e74c3c',
  diamonds: '#e74c3c',
  clubs: '#1a1a2e',
}

/** Single card display. */
export function CardDisplay({ card, width = 55, height = 80, fontSize = 18 }: {
  card: Card
  width?: number
  height?: number
  fontSize?: number
}) {
  return (
    <div style={{
      width: `${width}px`,
      height: `${height}px`,
      background: 'white',
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: SUIT_COLOURS[card.suit] ?? '#333',
      fontSize: `${fontSize}px`,
      fontWeight: 'bold',
      border: '2px solid #ddd',
      flexShrink: 0,
    }}>
      <div>{card.rank}</div>
      <div style={{ fontSize: `${Math.round(fontSize * 0.78)}px` }}>{SUIT_SYMBOLS[card.suit]}</div>
    </div>
  )
}

/** Placeholder card (face-down / unknown). */
export function CardBack({ width = 55, height = 80 }: { width?: number; height?: number }) {
  return (
    <div style={{
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: '6px',
      background: 'linear-gradient(135deg, #2c3e50 25%, #34495e 50%, #2c3e50 75%)',
      border: '2px solid #555',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${Math.round(height * 0.3)}px`,
      color: '#7f8c8d',
      flexShrink: 0,
    }}>
      ?
    </div>
  )
}

/** A row of cards displayed in a fan-like layout. Drop-in replacement for Hand3D. */
export function CardHand2D({ cards, cardWidth, cardHeight, fontSize }: {
  cards: Card[]
  cardWidth?: number
  cardHeight?: number
  fontSize?: number
}) {
  if (cards.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '6px',
      flexWrap: 'wrap',
      padding: '8px 0',
    }}>
      {cards.map((card, i) => (
        <CardDisplay
          key={`${card.rank}-${card.suit}-${i}`}
          card={card}
          width={cardWidth}
          height={cardHeight}
          fontSize={fontSize}
        />
      ))}
    </div>
  )
}
