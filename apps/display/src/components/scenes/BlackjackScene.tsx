/**
 * Blackjack scene — "The Floor".
 *
 * Dealer position at top, up to 4 player positions in arc.
 * Dealer hand: first card face up, second face down until reveal.
 * Player hands: both cards face up.
 * Hand value display, bust/blackjack/push indicators.
 */

import { useMemo } from 'react'
import { useStateSyncSelector } from '../../hooks/useVGFHooks.js'
import { CardDeckProvider, useCardDeck } from '../CardDeck.js'
import type { BlackjackGameState, BlackjackPlayerState } from '@weekend-casino/shared'
import type { Card } from '@weekend-casino/shared'

/** 3D card model from the GLB deck. */
function CardModel({
  card,
  faceUp = false,
  position,
}: {
  card: Card
  faceUp?: boolean
  position: [number, number, number]
}) {
  const { getCardClone, ready } = useCardDeck()
  const clone = useMemo(() => ready ? getCardClone(card) : null, [ready, card.rank, card.suit, getCardClone])

  if (!clone) return null

  return (
    <primitive
      object={clone}
      position={position}
      rotation={faceUp ? [-Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, Math.PI]}
      scale={CARD_SCALE}
    />
  )
}

/** Chip stack visualisation. */
function ChipStack({
  position,
  amount,
  colour = '#f39c12',
}: {
  position: [number, number, number]
  amount: number
  colour?: string
}) {
  if (amount <= 0) return null
  const height = Math.min(amount / 100, 0.3)
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]}>
      <cylinderGeometry args={[0.15, 0.15, height, 16]} />
      <meshStandardMaterial color={colour} />
    </mesh>
  )
}

/** Status indicator (bust/blackjack/push). */
function StatusIndicator({
  position,
  colour,
}: {
  position: [number, number, number]
  text?: string
  colour: string
}) {
  return (
    <mesh position={position}>
      <planeGeometry args={[0.8, 0.25]} />
      <meshBasicMaterial color={colour} />
    </mesh>
  )
}

/** Single player position on the blackjack table. */
function PlayerPosition({
  playerState,
  seatPosition,
}: {
  playerState: BlackjackPlayerState
  seatPosition: [number, number, number]
}) {
  const hand = playerState.hands[playerState.activeHandIndex] ?? playerState.hands[0]
  if (!hand) return null

  const isBusted = hand.busted
  const isBj = hand.isBlackjack
  const surrendered = playerState.surrendered

  return (
    <group position={seatPosition}>
      {/* Player's cards */}
      {hand.cards.map((card, i) => (
        <CardModel
          key={`${card.rank}-${card.suit}-${i}`}
          card={card}
          position={[(i - (hand.cards.length - 1) / 2) * 0.8, 0, 0]}
          faceUp
        />
      ))}

      {/* Bet chip */}
      <ChipStack
        position={[0, 0, 0.5]}
        amount={hand.bet}
        colour={hand.doubled ? '#e74c3c' : '#f39c12'}
      />

      {/* Split hands indicator (show number of hands) */}
      {playerState.hands.length > 1 && (
        <mesh position={[0.6, 0.1, -0.3]}>
          <planeGeometry args={[0.4, 0.2]} />
          <meshBasicMaterial color="#3498db" />
        </mesh>
      )}

      {/* Status indicators */}
      {isBj && (
        <StatusIndicator position={[0, 0.12, -0.4]} text="BLACKJACK" colour="#f1c40f" />
      )}
      {isBusted && (
        <StatusIndicator position={[0, 0.12, -0.4]} text="BUST" colour="#e74c3c" />
      )}
      {surrendered && (
        <StatusIndicator position={[0, 0.12, -0.4]} text="SURRENDER" colour="#95a5a6" />
      )}

      {/* Insurance indicator */}
      {playerState.insuranceBet > 0 && (
        <ChipStack position={[-0.5, 0, 0.5]} amount={playerState.insuranceBet} colour="#9b59b6" />
      )}
    </group>
  )
}

/** Dealer area with face-up and hole card. */
function DealerArea({
  bj,
}: {
  bj: BlackjackGameState
}) {
  const dealer = bj.dealerHand
  const hasCards = dealer.cards.length > 0

  return (
    <group position={[0, 0.86, -0.8]}>
      {/* Dealer cards */}
      {hasCards && dealer.cards.map((card, i) => (
        <CardModel
          key={`${card.rank}-${card.suit}-${i}`}
          card={card}
          position={[(i - (dealer.cards.length - 1) / 2) * 0.8, 0, 0]}
          faceUp={i === 0 || dealer.holeCardRevealed}
        />
      ))}

      {/* Dealer value / bust indicator */}
      {dealer.holeCardRevealed && (
        <mesh position={[0, 0.1, -0.5]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshBasicMaterial color={dealer.busted ? '#c0392b' : '#27ae60'} />
        </mesh>
      )}

      {/* Blackjack indicator */}
      {dealer.isBlackjack && dealer.holeCardRevealed && (
        <mesh position={[0, 0.15, -0.8]}>
          <planeGeometry args={[1.2, 0.25]} />
          <meshBasicMaterial color="#f1c40f" />
        </mesh>
      )}
    </group>
  )
}

/** Player seat positions in an arc across the bottom of the table. */
const SEAT_POSITIONS: [number, number, number][] = [
  [-2.0, 0.86, 1.5],
  [-0.7, 0.86, 2.0],
  [0.7, 0.86, 2.0],
  [2.0, 0.86, 1.5],
]

/** Card scale: GLB cards are ~100 units tall. 0.012 makes them ~1.2 units = good table size. */
const CARD_SCALE: [number, number, number] = [0.012, 0.012, 0.012]

export function BlackjackScene() {
  const bj = useStateSyncSelector(s => s.blackjack) as BlackjackGameState | undefined

  return (
    <group>
      {/* Scene-level camera override: closer to the table, looking down */}
      <group>
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#0d1117" />
        </mesh>

        {/* Semi-circle table — rotated so flat edge faces camera (bottom of screen) */}
        <mesh position={[0, 0.8, 0.5]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <cylinderGeometry args={[3.5, 3.5, 0.12, 48, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#2d8a5e" />
        </mesh>

        {/* Table rim / edge */}
        <mesh position={[0, 0.8, 0.5]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[3.55, 3.55, 0.15, 48, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#6b4c2a" />
        </mesh>

        {/* Table felt markings — betting circles */}
        {SEAT_POSITIONS.map((pos, i) => (
          <mesh key={i} position={[pos[0], 0.87, pos[2] - 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.25, 0.3, 32]} />
            <meshStandardMaterial color="#2a7a4a" emissive="#1a4a2a" emissiveIntensity={0.3} />
          </mesh>
        ))}

        <CardDeckProvider>
          {/* Dealer area — centred at top of table */}
          {bj && <DealerArea bj={bj} />}

          {/* Player positions — arc across bottom */}
          {bj?.playerStates.map((ps, i) => (
            <PlayerPosition
              key={ps.playerId}
              playerState={ps}
              seatPosition={SEAT_POSITIONS[i] ?? SEAT_POSITIONS[0]!}
            />
          ))}
        </CardDeckProvider>
      </group>

      {/* Bright casino lighting */}
      <ambientLight intensity={0.9} color="#fff5e6" />
      <spotLight
        position={[0, 8, 2]}
        angle={0.8}
        penumbra={0.3}
        intensity={3}
        castShadow
        color="#fffaf0"
      />
      <pointLight position={[-4, 5, 0]} intensity={1} color="#b0d0ff" />
      <pointLight position={[4, 5, 0]} intensity={1} color="#b0d0ff" />
      {/* Fill light from below/front */}
      <pointLight position={[0, 3, 6]} intensity={0.5} color="#fff5e6" />
    </group>
  )
}
